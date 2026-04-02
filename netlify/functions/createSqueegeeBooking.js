exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");

    const {
      name = "",
      email = "",
      phone = "",
      address = "",
      bins = [],
      notes = "",
      recaptchaToken = "",
    } = payload;

    if (!name || !email || !phone || !address || !recaptchaToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const safeBins = Array.isArray(bins) ? bins : [];

    const getAnswer = (typeLabel) => {
      const found = safeBins.find((b) => (b?.type || "").toLowerCase().includes(typeLabel));
      return found || null;
    };

    const firstBin = safeBins[0] || {};

    const questionAnswers = [
      {
        questionId: "question.bin-count-choice",
        question: "How many bins do you have?",
        answer: String(
          safeBins.reduce((sum, b) => sum + (Number(b?.count || 1)), 0) || 1
        ),
      },
      {
        questionId: "question.bin-size-choice",
        question: "What size are your bins?",
        answer: firstBin.size || "Domestic 120L",
      },
      {
        questionId: "question.bin-frequency-choice",
        question: "How often would you like to have your bins cleaned? ",
        answer: firstBin.frequency || firstBin.planLabel || "After Every Bin Lorry Visit",
      },
      {
        questionId: "question.bin-clean-type-choice",
        question: "What kind of clean would you like to book? ",
        answer: firstBin.cleanType || "Maintenance Clean",
      },
    ];

    const squegeePayload = {
      clientId: "nibinguy",
      name,
      email,
      phone,
      location: {},
      additionalInfo: notes || "",
      errors: [],
      locale: "en-US",
      questionAnswers,
      recaptcha: recaptchaToken,
      selectedServices: [
        {
          children: [],
          description: "",
          id: "service.bin-cleaning",
          name: "Bin/Garbage Can Cleaning",
        },
      ],
    };

    const res = await fetch("https://squeeg.ee/api/quote-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(squegeePayload),
    });

    const data = await res.json();

    if (!res.ok || !data?.success) {
      console.error("Squeegee error:", data);
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Failed to create Squeegee booking",
          details: data,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        customerId: data.customerId,
        quoteId: data.quote?._id || null,
        squegee: data,
      }),
    };
  } catch (error) {
    console.error("createSqueegeeBooking failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Squeegee booking failed",
        details: error.message,
      }),
    };
  }
};
