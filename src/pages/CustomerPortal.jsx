import React, { useEffect } from "react"
import { Link } from "react-router-dom"

const SQUEEGEE_SCRIPT_ID = "squeegee-portal-script"

export default function CustomerPortal() {
  useEffect(() => {
    if (document.getElementById(SQUEEGEE_SCRIPT_ID)) return

    const script = document.createElement("script")
    script.id = SQUEEGEE_SCRIPT_ID
    script.src = "https://widgets.sqg.ee/main.js"
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  }, [])

  return (
    <main id="main-content" tabIndex="-1" className="min-h-screen bg-black text-white px-4 py-10">
      <section aria-labelledby="portal-title" className="mx-auto max-w-5xl text-center">
        <Link to="/" className="inline-block text-green-400 underline underline-offset-4 hover:text-green-300">
          Back to homepage
        </Link>

        <h1 id="portal-title" className="mt-6 text-3xl font-extrabold text-green-400 sm:text-4xl">
          Customer Portal
        </h1>

        <p className="mx-auto mt-3 max-w-2xl text-zinc-300">
          Manage your Ni Bin Guy account, payments and service details in the secure customer portal.
        </p>

        <div
          className="mx-auto mt-8 block min-h-[700px] w-full max-w-3xl rounded-2xl border border-white/30 bg-zinc-900 p-5 shadow-lg"
          data-sqc="layout"
          data-sqa="25a031e7-75af-4a0e-9f3a-d308fd9b2e3a"
          data-sqe="https://sqgee.com"
        />
      </section>
    </main>
  )
}
