exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const {
      name,
      email,
      phone,
      address,
      bins,
      binSize,
      frequency,
      cleanType,
      notes,
      recaptchaToken,
    } = JSON.parse(event.body || "{}");

    if (!name || !email || !phone || !address || !recaptchaToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const questionAnswers = [
      {
        questionId: "question.bin-count",
        question: "How many bins do you have?",
        answer: bins || "",
      },
      {
        questionId: "question.bin-size",
        question: "What size are your bins?",
        answer: binSize || "",
      },
      {
        questionId: "question.clean-frequency",
        question: "How often would you like to have your bins cleaned?",
        answer: frequency || "",
      },
      {
        questionId: "question.clean-type",
        question: "What kind of clean would you like to book?",
        answer: cleanType || "",
      },
    ];

    const selectedServices = [
      {
        children: [],
        description: "",
        id: "service.bin-cleaning",
        name: "Bin/Garbage Can Cleaning",
      },
    ];

    const squegeePayload = {
      clientId: "nibinguy",
      name,
      email,
      phone,
      location: {
        formattedAddress: address,
      },
      additionalInfo: notes || "",
      errors: [],
      locale: "en-US",
      questionAnswers,
      recaptcha: recaptchaToken,
      selectedServices,
    };

    const squegeeRes = await fetch("https://squeeg.ee/api/quote-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(squegeePayload),
    });

    const squegeeData = await squegeeRes.json();

    if (!squegeeRes.ok || !squegeeData.success) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Squeegee booking failed",
          details: squegeeData,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        squegee: squegeeData,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Unknown error",
      }),
    };
  }
};
