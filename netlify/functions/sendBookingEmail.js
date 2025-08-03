const { Resend } = require('resend');

// Initialize Resend with your environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  console.log('Resend API Key inside function:', process.env.RESEND_API_KEY);

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { name, email, address, phone, bins } = JSON.parse(event.body);

    const formattedBins = bins
      .map((b) => `${b.count} x ${b.type} (${b.frequency})`)
      .join('<br>');

    const response = await resend.emails.send({
      from: 'Ni Bin Guy <noreply@nibing.uy>',
      to: 'aabincleaning@gmail.com',
      subject: '🗑️ New Bin Cleaning Booking',
     html: `
  <h2>New Bin Cleaning Booking Received</h2>
  <p><strong>Name:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Phone:</strong> ${phone}</p>
  <p><strong>Address:</strong> ${address}</p>
  <p><strong>Bins:</strong><br>${formattedBins}</p>
`,
    });

    console.log('Resend API Response:', response);

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
};
