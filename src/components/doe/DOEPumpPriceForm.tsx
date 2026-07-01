'use client'

import { useState } from 'react'
import { Station } from '@/types/database'
import { Printer } from 'lucide-react'

// Standard DOE fuel products for gas stations
const PRODUCTS = [
  'Unleaded Gasoline (RON 91)',
  'Premium Gasoline (RON 95)',
  'Premium Gasoline (RON 97/100)',
  'Diesel (Euro 4)',
  'Diesel (Euro 5)',
  'Kerosene',
  'Liquefied Petroleum Gas (LPG)',
]

// Get the Tuesday of the current week (or next Tuesday if today is past Tuesday)
function getReportDate(): string {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 2=Tue
  const diff = (2 - day + 7) % 7 // days until next/current Tuesday
  const tuesday = new Date(today)
  tuesday.setDate(today.getDate() + (diff === 0 ? 0 : diff))
  return tuesday.toISOString().split('T')[0]
}

type PriceGrid = Record<string, Record<string, string>> // productName → stationId → price

export default function DOEPumpPriceForm({
  stations,
  orgName,
  orgId,
}: {
  stations: Pick<Station, 'id' | 'name'>[]
  orgName: string
  orgId: string
}) {
  const [reportDate, setReportDate] = useState(getReportDate())
  const [prices, setPrices] = useState<PriceGrid>({})
  const [preview, setPreview] = useState(false)

  // Only these stations are required to SUBMIT the weekly DOE report — the
  // printable PDF shows only them. Price entry below stays open to all stations.
  const DOE_ORDER = ['San Juan', 'Quibaol', 'Domalandan']
  const doeStations = stations
    .filter(s => DOE_ORDER.some(n => s.name.includes(n)))
    .sort((a, b) => DOE_ORDER.findIndex(n => a.name.includes(n)) - DOE_ORDER.findIndex(n => b.name.includes(n)))

  function setPrice(product: string, stationId: string, value: string) {
    setPrices(prev => ({
      ...prev,
      [product]: { ...(prev[product] ?? {}), [stationId]: value },
    }))
  }

  const reportDateFormatted = new Date(reportDate + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  if (preview) {
    return (
      <div>
        <button onClick={() => setPreview(false)} className="mb-4 text-sm text-red-600 hover:underline no-print">
          ← Back to form
        </button>

        <div className="mb-4 no-print">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>

        {/* Printable DOE report */}
        <div
          className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 max-w-3xl print:shadow-none print:border-none print:rounded-none"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}
        >
          <div className="text-center mb-6">
            <div className="text-base font-bold uppercase">Department of Energy</div>
            <div className="text-sm font-bold uppercase">Oil Industry Management Bureau</div>
            <div className="text-sm mt-1">WEEKLY PUMP PRICE REPORT</div>
            <div className="text-sm mt-1">
              <span className="font-bold">Dealer/Operator:</span> {orgName}
            </div>
            <div className="text-sm mt-0.5">
              <span className="font-bold">Report Date:</span> {reportDateFormatted}
            </div>
          </div>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-3 py-2 text-left font-bold">Product</th>
                {doeStations.map(s => (
                  <th key={s.id} className="border border-gray-400 px-3 py-2 text-center font-bold">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((product, i) => (
                <tr key={product} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-400 px-3 py-2">{product}</td>
                  {doeStations.map(s => (
                    <td key={s.id} className="border border-gray-400 px-3 py-2 text-center">
                      {prices[product]?.[s.id]
                        ? `₱${parseFloat(prices[product][s.id]).toFixed(2)}`
                        : <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
            <div>
              <div className="border-t border-gray-800 pt-2 mt-8">Prepared by (signature over printed name)</div>
              <div className="mt-1">Date: ___________________</div>
            </div>
            <div>
              <div className="border-t border-gray-800 pt-2 mt-8">Approved by / Station Owner</div>
              <div className="mt-1">Date: ___________________</div>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500 italic text-center">
            Submit to DOE – Oil Industry Management Bureau every Tuesday. Prices in Philippine Pesos per liter.
          </div>
        </div>

        <style>{`@media print { .no-print { display: none !important; } }`}</style>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">Report date (Tuesday)</label>
        <input
          type="date"
          value={reportDate}
          onChange={e => setReportDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Product</th>
              {stations.map(s => (
                <th key={s.id} className="text-center px-4 py-3 font-medium">{s.name}<br/><span className="text-gray-400 font-normal normal-case">(₱/liter)</span></th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {PRODUCTS.map(product => (
              <tr key={product} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 text-gray-700 text-sm">{product}</td>
                {stations.map(s => (
                  <td key={s.id} className="px-4 py-2 text-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={prices[product]?.[s.id] ?? ''}
                      onChange={e => setPrice(product, s.id, e.target.value)}
                      className="w-24 border border-gray-200 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => setPreview(true)}
        className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
      >
        Preview & Print Report
      </button>
    </div>
  )
}
