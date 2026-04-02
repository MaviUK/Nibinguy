// netlify/functions/createSqueegeeBooking.js

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);

    const {
      name,
      email,
      phone,
      address,
      bins = [],
    } = data;

    // 🔹 Build description from bins
    const description = bins
      .map((b) => {
        const plan = b.planId || "";
        return `${b.count || 1} x ${b.type} (${plan})`;
      })
      .join("\n");

    // 🔹 STEP 1: Create customer
    const customerRes = await fetch("https://api.squeegeeapp.com/v1/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SQUEEGEE_API_KEY}`,
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        address: {
          line1: address,
        },
      }),
    });

    const customerData = await customerRes.json();

    if (!customerData?.data?._id) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to create customer", customerData }),
      };
    }

    const customerId = customerData.data._id;

    // 🔹 STEP 2: Create quote (job)
    const quoteRes = await fetch("https://api.squeegeeapp.com/v1/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SQUEEGEE_API_KEY}`,
      },
      body: JSON.stringify({
        customerId,
        name,
        items: [
          {
            title: "Bin Cleaning",
            description,
            quantity: 1,
            unitPrice: 0,
            type: "job",
          },
        ],
      }),
    });

    const quoteData = await quoteRes.json();

    if (!quoteData?.data?._id) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to create quote", quoteData }),
      };
    }

    const quoteId = quoteData.data._id;

    // ✅ Return both IDs to frontend
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        customerId,
        quoteId,
      }),
    };

  } catch (err) {
    console.error("Squeegee error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Squeegee booking failed" }),
    };
  }
};
