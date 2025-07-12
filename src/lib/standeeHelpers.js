import { supabase } from './supabaseClient'
import { Resend } from 'resend'

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY)

// Utility to create slug from string
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

// Main function
export async function submitClaim({
  address,
  bins,
  dates,
  neighbourName,
  nominatedAddress,
  town,
  postcode
}) {
  const slug = slugify(address)
  const fullAddress = `${nominatedAddress}, ${town}`
  const nominatedSlug = slugify(fullAddress)

  // Step 1: Save claim (excluding neighbour name)
  const { error: claimError } = await supabase.from('claims').insert([
    {
      address,
      slug,
      claimed_at: new Date().toISOString(),
      bins,
      selected_date_1: dates[0],
      selected_date_2: dates[1],
      nominated_address: nominatedAddress,
      town,
      postcode
    }
  ])

  if (claimError) {
    console.error('❌ Claim submission error:', claimError)
    return { success: false, error: claimError.message }
  }

  // Step 2: Get current standee location
  const { data: locationData, error: locationError } = await supabase
    .from('standee_location')
    .select('*')
    .eq('current_slug', slug)
    .maybeSingle()

  if (locationError) {
    console.error('❌ Error fetching standee location:', locationError)
    return { success: false, error: locationError.message }
  }

  if (!locationData) {
    return { success: false, error: 'This standee does not exist.' }
  }

  // Step 3: Update standee location
  const updatedHistory = [
    ...(locationData.history || []),
    {
      address: locationData.current_address,
      slug: locationData.current_slug,
      timestamp: new Date().toISOString()
    }
  ]

  const { error: updateError } = await supabase
    .from('standee_location')
    .update({
      current_address: fullAddress,
      current_slug: nominatedSlug,
      claimed: false,
      updated_at: new Date().toISOString(),
      history: updatedHistory
    })
    .eq('id', locationData.id)

  if (updateError) {
    console.error('❌ Error updating standee location:', updateError)
    return { success: false, error: updateError.message }
  }

  // Step 4: Send email
  try {
    await resend.emails.send({
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
  } catch (emailError) {
    console.error('❌ Email failed to send:', emailError)
    return { success: false, error: 'Saved, but email failed to send.' }
  }

  return { success: true }
}
