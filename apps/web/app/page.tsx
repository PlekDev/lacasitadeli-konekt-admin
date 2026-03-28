export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          La Casita Deli 🥪
        </h1>
        <p className="text-lg text-gray-600">
          Sistema de Gestión de Inventario y Ventas v0.1.0
        </p>
        
        <div className="mt-8 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left">
          
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className={`mb-3 text-2xl font-semibold`}>
              Inventario 📦
            </h2>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Control de stock en tiempo real de almacenes y puntos de venta.
            </p>
          </div>

          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className={`mb-3 text-2xl font-semibold`}>
              Ventas 💰
            </h2>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Sincronización con Shopify y POS físico.
            </p>
          </div>

          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className={`mb-3 text-2xl font-semibold`}>
              Automatizaciones ⚡
            </h2>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Alertas automáticas y reportes vía n8n.
            </p>
          </div>

        </div>
      </div>
    </main>
  )
}