export async function POST(request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return Response.json({ error: 'No API key configured' }, { status: 500 });
    }

    const body = await request.json();

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        return new Response(text, { status: response.status });
    }

    const blob = await response.blob();
    return new Response(blob, {
        headers: { 'Content-Type': 'audio/mpeg' },
    });
}
