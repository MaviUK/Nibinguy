import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  const body = JSON.parse(event.body)

  const {
    neighbourName,
    address,
    bins,
    dates,
    nominatedAddress,
    town,
    postcode
  } = body

  try {
    const { error } = await resend.emails.send({
      from: 'noreply@nibinguy.uy',
      to: 'aabincleaning@gmail.com',
      subject: '🎉 New Free Bin Clean Claimed',
      html: `
        <h2>🧼 New Claim Received</h2>
        <p><strong>Neighbour Name:</strong> ${neighbourName}</p>
        <p><strong>Original Address:</strong> ${address}</p>
        <p><strong>Selected Bin:</strong> ${bins[0]}</p>
        <p><strong>Selected Dates:</strong> ${dates[0]} and ${dates[1]}</p>
        <hr/>
        <h3>📍 Standee Nominated To:</h3>
        <p><strong>Address:</strong> ${nominatedAddress}</p>
        <p><strong>Town:</strong> ${town}</p>
        <p><strong>Postcode:</strong> ${postcode}</p>
      `
    })

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: error.message })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    }
  }
}
