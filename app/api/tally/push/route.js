import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { xml } = await req.json();
    
    if (!xml) {
      return NextResponse.json({ success: false, error: "No XML payload provided" }, { status: 400 });
    }

    // Attempt to push to Tally's default local server port (9000)
    // We use a short timeout so it doesn't hang if Tally is off
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await fetch('http://127.0.0.1:9000', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
        },
        body: xml,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error("Connection to Tally timed out. Is Tally running and set to 'Act as Server' on port 9000?");
      }
      throw new Error("Could not connect to Tally. Ensure Tally is running on the same machine and HTTP port 9000 is open.");
    }

    if (!response.ok) {
      throw new Error(`Tally Server Error: ${response.status}`);
    }
    
    const responseText = await response.text();
    
    // Check if Tally returned an internal error in the XML response
    if (responseText.includes('<ERRORS>') && responseText.includes('</ERRORS>')) {
      const match = responseText.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
      if (match) {
        throw new Error(`Tally rejected the import: ${match[1]}`);
      }
    }

    return NextResponse.json({ success: true, message: "Pushed to Tally successfully!", tallyResponse: responseText });
    
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
