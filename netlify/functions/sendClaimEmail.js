import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
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

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Email sending failed:', err)
    return res.status(500).json({ error: 'Email send failed' })
  }
}
