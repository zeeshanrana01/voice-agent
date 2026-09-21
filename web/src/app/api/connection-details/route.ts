import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
    const wsUrl = (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL)?.trim();

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: 'LiveKit environment variables (LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL) are not configured.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const roomName = searchParams.get('roomName') || `room-${Date.now().toString(36)}-${randomSuffix}`;
    const participantName = searchParams.get('participantName') || `user-${randomSuffix}`;

    // 1. Create participant access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    // 2. Ensure agent dispatch exists for this room
    try {
      const httpUrl = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      const dispatchClient = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
      await dispatchClient.createDispatch(roomName, '');
    } catch (dispatchError: any) {
      console.warn('Dispatch creation note:', dispatchError?.message || dispatchError);
    }

    const participantToken = await at.toJwt();

    return NextResponse.json({
      serverUrl: wsUrl,
      roomName,
      participantToken,
      participantName,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
