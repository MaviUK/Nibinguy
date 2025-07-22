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
    const {
      subject,
      name,
      address,
      email,
      phone,
      binType,
      nominatedAddress,
      firstDate,
      secondDate,
      standeeLocation,
      dates
    } = JSON.parse(event.body);

    let htmlContent = '';

    if (subject === 'Wheelie Watcher Spotted') {
      if (!name || !address || !email || !phone || !binType || !firstDate || !secondDate || !standeeLocation) {
        console.log('Missing required fields for Wheelie Watcher:', { name, address, email, phone, binType, firstDate, secondDate, standeeLocation });
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields for Wheelie Watcher' }),
        };
      }

      htmlContent = `
        <h3>🕵️ Wheelie Watcher Spotted!</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mobile:</strong> ${phone}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Standee Location:</strong> ${standeeLocation}</p>
        <p><strong>Bin Type:</strong> ${binType}</p>
        <p><strong>Next Bin Clean Dates:</strong> ${firstDate}, ${secondDate}</p>
      `;
    } else {
      if (!name || !address || !email || !binType || !nominatedAddress) {
        console.log('Missing required fields for Homeowner Claim:', { name, address, email, binType, nominatedAddress, dates });
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields for Homeowner Claim' }),
        };
      }

      htmlContent = `
        <h3>🎁 New Standee Claim Submitted!</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Bin Type:</strong> ${binType}</p>
        <p><strong>Nominated Address:</strong> ${nominatedAddress}</p>
        <p><strong>Next Bin Clean Dates:</strong> ${Array.isArray(dates) ? dates.join(", ") : "Not provided"}</p>
      `;
    }

    const response = await resend.emails.send({
      from: "noreply@nibing.uy",
      to: "aabincleaning@gmail.com",
      subject: subject || "New Standee Claim Submitted!",
      html: htmlContent,
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
