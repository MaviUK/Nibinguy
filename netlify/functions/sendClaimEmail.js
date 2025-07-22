const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { name, address, email, binType, nominatedAddress } = JSON.parse(event.body);

    if (!name || !address || !email || !binType || !nominatedAddress) {
      console.log('Missing required fields:', { name, address, email, binType, nominatedAddress });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const response = await resend.emails.send({
  from: "noreply@nibing.uy",
  to: "aabincleaning@gmail.com",
  subject: "New Standee Claim Submitted!",
  html: `
    <h3>New Standee Claim Submitted!</h3>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Address:</strong> ${address}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Bin Type:</strong> ${binType}</p>
    <p><strong>Nominated Address:</strong> ${nominatedAddress}</p>
    <p><strong>Next Bin Clean Dates:</strong> ${dates ? dates.join(", ") : "Not provided"}</p>
  `,
});


    console.log('Resend API Response:', response);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully', resendResponse: response }),
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Email send failed', details: error.message }),
    };
  }
};
