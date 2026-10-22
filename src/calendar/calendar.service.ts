import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { appZone } from '../common/time';
import { eventInterval, type Interval } from '../common/overlap';

const HOST_ID = 'host';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

type ConnectionReader = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private oauth() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return null;
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  authUrl(): string {
    const client = this.oauth();
    if (!client) {
      throw new BadRequestException('Google Calendar is not configured');
    }
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [CALENDAR_SCOPE],
    });
  }

  async status() {
    const row = await this.prisma.calendarConnection.findUnique({
      where: { id: HOST_ID },
    });
    return { connected: Boolean(row), email: row?.email ?? null };
  }

  async connect(code: string) {
    const client = this.oauth();
    if (!client) {
      throw new BadRequestException('Google Calendar is not configured');
    }
    const existing = await this.prisma.calendarConnection.findUnique({
      where: { id: HOST_ID },
    });
    const { tokens } = await client.getToken(code);
    const refreshToken = tokens.refresh_token ?? existing?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException(
        'Google did not return a refresh token. Try connecting again.',
      );
    }
    client.setCredentials({ ...tokens, refresh_token: refreshToken });
    let email = existing?.email ?? null;
    try {
      const calendar = google.calendar({ version: 'v3', auth: client });
      const primary = await calendar.calendarList.get({
        calendarId: 'primary',
      });
      email = primary.data.id ?? email;
    } catch {
      email = existing?.email ?? null;
    }
    await this.prisma.calendarConnection.upsert({
      where: { id: HOST_ID },
      create: { id: HOST_ID, refreshToken, email },
      update: { refreshToken, email, connectedAt: new Date() },
    });
  }

  async disconnect() {
    await this.prisma.calendarConnection.deleteMany({ where: { id: HOST_ID } });
  }

  async busyBetween(
    start: Date,
    end: Date,
    db: ConnectionReader = this.prisma,
  ): Promise<Interval[] | null> {
    const row = await db.calendarConnection.findUnique({
      where: { id: HOST_ID },
    });
    if (!row) {
      return [];
    }
    const client = this.oauth();
    if (!client) {
      return null;
    }
    try {
      client.setCredentials({ refresh_token: row.refreshToken });
      const calendar = google.calendar({ version: 'v3', auth: client });
      const intervals: Interval[] = [];
      let pageToken: string | undefined;
      let pages = 0;
      do {
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
          pageToken,
        });
        for (const event of response.data.items ?? []) {
          const interval = eventInterval(
            {
              status: event.status,
              transparency: event.transparency,
              start: event.start,
              end: event.end,
            },
            appZone(),
          );
          if (interval) {
            intervals.push(interval);
          }
        }
        pageToken = response.data.nextPageToken ?? undefined;
        pages += 1;
      } while (pageToken && pages < 10);
      return intervals;
    } catch {
      return null;
    }
  }
}
