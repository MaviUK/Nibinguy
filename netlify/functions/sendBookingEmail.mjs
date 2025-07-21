import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { name, email, address, bins } = JSON.parse(event.body);

    const formattedBins = bins
      .map((b) => `${b.count} x ${b.type} (${b.frequency})`)
      .join('<br>');

    await resend.emails.send({
      from: 'Ni Bin Guy <noreply@nibinguy.uy>',
      to: 'aabincleaning@gmail.com',
      subject: '🗑️ New Bin Cleaning Booking',
      html: `
        <h2>New Bin Cleaning Booking Received</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Bins:</strong><br>${formattedBins}</p>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Booking email failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Email send failed' }),
    };
  }
}
