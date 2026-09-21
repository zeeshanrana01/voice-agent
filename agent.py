import logging
import os
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, inference, TurnHandlingOptions

load_dotenv(".env")

# Filter out harmless Windows asyncio polling watchdog warnings from terminal
class EventLoopWatchdogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return "event loop blocked" not in record.getMessage()

logging.getLogger("livekit.agents").addFilter(EventLoopWatchdogFilter())


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a helpful voice AI assistant.
            You eagerly assist users with their questions by providing information from your extensive knowledge.
            Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
            You are curious, friendly, and have a sense of humor.""",
        )


server = AgentServer()


@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    # Initialize AgentSession with Deepgram STT, Gemma LLM, and Inworld TTS
    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        llm=inference.LLM(model="google/gemma-4-31b-it"),
        tts=inference.TTS(
            model="inworld/inworld-tts-2",
            voice="Ashley",
        ),
        turn_handling=TurnHandlingOptions(
            turn_detection=inference.TurnDetector(),
        ),
    )

    # session.start automatically establishes the single room connection via RoomIO
    await session.start(
        agent=Assistant(),
        room=ctx.room,
    )

    # Greet user once connected
    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )


if __name__ == "__main__":
    print("\n" + "=" * 65)
    print(" >>> Ashley Voice AI Agent Worker Starting Up <<<")
    print(" LiveKit Cloud: Connected & Ready")
    print(" To talk to the agent: Open your browser and click 'Start Voice Conversation'")
    print("=" * 65 + "\n")
    agents.cli.run_app(server)