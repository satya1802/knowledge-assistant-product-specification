"""Unit tests for the in-memory document SSE broker."""

import asyncio

from app.services.sse import DocumentEventBroker


def test_publish_delivers_to_subscriber_queue() -> None:
    broker = DocumentEventBroker()
    q = broker.subscribe()

    broker.publish("document.status", {"id": "abc", "status": "ready"})

    payload = q.get_nowait()
    assert "event: document.status" in payload
    assert '"status": "ready"' in payload


def test_unsubscribed_queue_receives_nothing() -> None:
    broker = DocumentEventBroker()
    q = broker.subscribe()
    broker.unsubscribe(q)

    broker.publish("document.status", {"id": "abc", "status": "ready"})

    assert q.empty()


def test_multiple_subscribers_all_receive_the_event() -> None:
    broker = DocumentEventBroker()
    q1 = broker.subscribe()
    q2 = broker.subscribe()

    broker.publish("document.status", {"id": "abc", "status": "failed"})

    assert not q1.empty()
    assert not q2.empty()


def test_stream_yields_published_event() -> None:
    async def run() -> str:
        broker = DocumentEventBroker()

        async def produce() -> None:
            await asyncio.sleep(0.01)
            broker.publish("document.status", {"id": "x", "status": "ready"})

        gen = broker.stream()
        asyncio.get_event_loop().create_task(produce())
        payload = await gen.__anext__()
        await gen.aclose()
        return payload

    payload = asyncio.run(run())
    assert "document.status" in payload
