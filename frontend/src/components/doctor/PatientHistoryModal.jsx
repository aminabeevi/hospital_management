import { useState, useEffect } from 'react';
import { doctorService } from '../../services/doctorService';
import { X, Calendar, Pill, HeartPulse, FileText, Activity } from 'lucide-react';

export default function PatientHistoryModal({ isOpen, onClose, patientId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (isOpen && patientId) {
      setLoading(true);
      doctorService.getPatientHistory(patientId)
        .then((res) => {
          if (res.success) {
            setData(res);
          }
        })
        .catch((err) => console.error('Failed to load patient history:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/30 text-teal-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Patient Medical History</h3>
              <p className="text-xs text-slate-400">
                {data?.patient ? `${data.patient.name} • ${data.patient.phone} • Blood: ${data.patient.blood_group || 'O+'}` : 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-500">
              Retrieving electronic health records...
            </div>
          ) : data ? (
            <>
              {/* Demographics Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Date of Birth</span>
                  <span className="font-semibold text-slate-800">{data.patient.dob || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Gender</span>
                  <span className="font-semibold text-slate-800 capitalize">{data.patient.gender || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Emergency Contact</span>
                  <span className="font-semibold text-slate-800">{data.patient.emergency_contact_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Emergency Phone</span>
                  <span className="font-semibold text-slate-800 font-mono">{data.patient.emergency_contact_phone || 'N/A'}</span>
                </div>
              </div>

              {/* Consultation History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-600" /> Past Consultations & Diagnoses ({data.history.length})
                </h4>

                {data.history.length > 0 ? (
                  data.history.map((record) => {
                    const vitals = typeof record.vitals === 'string' ? JSON.parse(record.vitals) : record.vitals;
                    return (
                      <div key={record.record_id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-xs text-teal-800 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> {record.appointment_date}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Dr. {record.doctor_name} ({record.department_name})
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase">Diagnosis:</span>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">{record.diagnosis}</div>
                        </div>

                        {record.symptoms && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Reported Symptoms:</span>
                            <div className="text-xs text-slate-600">{record.symptoms}</div>
                          </div>
                        )}

                        {vitals && (
                          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                            {vitals.bp && <span className="px-2 py-0.5 bg-slate-100 rounded font-mono">BP: {vitals.bp}</span>}
                            {vitals.pulse && <span className="px-2 py-0.5 bg-slate-100 rounded font-mono">Pulse: {vitals.pulse} bpm</span>}
                            {vitals.temp && <span className="px-2 py-0.5 bg-slate-100 rounded font-mono">Temp: {vitals.temp} °F</span>}
                            {vitals.weight_kg && <span className="px-2 py-0.5 bg-slate-100 rounded font-mono">Weight: {vitals.weight_kg} kg</span>}
                          </div>
                        )}

                        {record.doctor_notes && (
                          <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                            Notes: "{record.doctor_notes}"
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic">No previous consultation records logged yet.</p>
                )}
              </div>

              {/* Prescriptions History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-teal-600" /> Prescriptions History ({data.prescriptions.length})
                </h4>

                {data.prescriptions.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {data.prescriptions.map((rx) => (
                      <div key={rx.id} className="p-3 bg-white flex items-center justify-between gap-4">
                        <div>
                          <span className="font-bold text-slate-900">{rx.medicine_name}</span>
                          <span className="text-slate-500 ml-2 font-mono">({rx.dosage} • {rx.frequency})</span>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Duration: {rx.duration} • {rx.instructions}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                          {rx.date}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No historical prescriptions found.</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 text-center">Unable to load data.</div>
          )}
        </div>
      </div>
    </div>
  );
}

