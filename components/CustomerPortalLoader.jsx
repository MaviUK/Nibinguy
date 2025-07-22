import { useEffect } from 'react'

export default function CustomerPortalLoader() {
  useEffect(() => {
    const portalDiv = document.createElement('div')
    portalDiv.innerHTML = `
      <section style="padding: 40px; background: black; text-align: center; color: white;">
        <h2 style="font-size: 1.875rem; font-weight: bold; color: #4ade80; margin-bottom: 20px;">Customer Portal</h2>
        <div 
          data-sqc="layout"
          data-sqa="25a031e7-75af-4a0e-9f3a-d308fd9b2e3a"
          data-sqe="https://sqgee.com"
          style="
            width: 100%;
            max-width: 800px;
            min-height: 700px;
            margin: 0 auto;
            display: block;
            background: #18181b;
            border-radius: 1rem;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            overflow: visible;
            padding: 20px;
            box-sizing: border-box;
          "
        ></div>
      </section>
    `
    document.body.appendChild(portalDiv)
    return () => {
      document.body.removeChild(portalDiv)
    }
  }, [])

  return null
}
