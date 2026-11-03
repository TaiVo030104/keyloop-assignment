import type { AppointmentView } from '@/api/queries'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/format'

export function AppointmentList(props: { appointments: AppointmentView[]; timeZone: string; caption: string; onCancel: (a: AppointmentView) => void }) {
  const { appointments, timeZone } = props
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{props.caption}</caption>
        <thead className="bg-slate-100 text-slate-800">
          <tr>
            <th scope="col" className="px-3 py-2">Time</th>
            <th scope="col" className="px-3 py-2">Customer</th>
            <th scope="col" className="px-3 py-2">Vehicle</th>
            <th scope="col" className="px-3 py-2">Service</th>
            <th scope="col" className="px-3 py-2">Technician</th>
            <th scope="col" className="px-3 py-2">Bay</th>
            <th scope="col" className="px-3 py-2">Status</th>
            <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => {
            const cancelled = a.status === 'CANCELLED'
            return (
              <tr key={a.id} className={`border-t border-slate-200 ${cancelled ? 'text-slate-500' : ''}`}>
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  {formatTime(a.start, timeZone)}–{formatTime(a.end, timeZone)}
                  <span className="block text-xs font-normal text-slate-600">{a.reference}</span>
                </td>
                <td className="px-3 py-2">{a.customerName}</td>
                <td className="px-3 py-2">{a.vehicleLabel}</td>
                <td className="px-3 py-2">{a.serviceTypeName}</td>
                <td className="px-3 py-2">{a.technicianName}</td>
                <td className="px-3 py-2">{a.bayName}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cancelled ? 'bg-slate-200 text-slate-800' : 'bg-green-100 text-green-900'}`}>
                    {cancelled ? 'Cancelled' : 'Confirmed'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {!cancelled && (
                    <Button variant="ghost" onClick={() => props.onCancel(a)} aria-label={`Cancel ${a.reference} for ${a.customerName}`}>
                      Cancel
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
