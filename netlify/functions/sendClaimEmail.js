import { Resend } from 'resend'

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
    const {
      neighbourName,
      address,
      bins,
      dates,
      nominatedAddress,
      town,
      postcode
    } = req.body

    const formattedDates = dates.join(' and ')
    const formattedBins = bins.join(', ')
    const fullAddress = `${nominatedAddress}, ${town}, ${postcode}`

    await resend.emails.send({
      from: 'Ni Bin Guy <noreply@nibing.uy>',
      to: 'aabincleaning@gmail.com',
      subject: '🧼 New Standee Claim Submitted',
      html: `
        <h2>🎉 A new neighbour has claimed their free clean!</h2>
        <p><strong>Name:</strong> ${neighbourName}</p>
        <p><strong>Bin selected:</strong> ${formattedBins}</p>
        <p><strong>Clean dates:</strong> ${formattedDates}</p>
        <p><strong>Current standee location:</strong> ${address}</p>
        <p><strong>Nominated to:</strong> ${fullAddress}</p>
      `
    })
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
