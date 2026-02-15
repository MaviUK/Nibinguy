// netlify/functions/createBooking.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");

    const { error, data } = await supabase
      .from("bookings")
      .insert({
        full_name: body.full_name,
        email: body.email,
        phone: body.phone,
        address_formatted: body.address_formatted,
        postcode: body.postcode,
        locality: body.locality,
        place_id: body.place_id,
        bins: body.bins,
        notes: body.notes || "",
        status: "new",
      })
      .select()
      .single();

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ ok: true, id: data.id }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
}
