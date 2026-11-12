import { useState, useEffect } from 'react';
import { doctorService } from '../../services/doctorService';
import {
  X,
  Stethoscope,
  Activity,
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  HeartPulse,
} from 'lucide-react';

export default function ConsultationModal({ isOpen, onClose, appointment, onConsultationSaved }) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clinical Consultation State
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');

  // Vitals State
  const [vitals, setVitals] = useState({
    bp: '120/80',
    pulse: '72',
    temp: '98.6',
    weight_kg: '70',
  });

  // Dynamic Prescriptions State
  const [prescriptions, setPrescriptions] = useState([
    {
      medicine_name: '',
      dosage: '500mg',
      frequency: '1-0-1 (After meals)',
      duration: '5 days',
      instructions: 'Take with warm water',
    },
  ]);

  useEffect(() => {
    if (isOpen && appointment) {
      setInitialLoading(true);
      setError(null);

      doctorService.getConsultationDetails(appointment.id)
        .then((res) => {
          if (res.success) {
            if (res.medicalRecord) {
              setSymptoms(res.medicalRecord.symptoms || '');
              setDiagnosis(res.medicalRecord.diagnosis || '');
              setDoctorNotes(res.medicalRecord.doctor_notes || '');
              if (res.medicalRecord.vitals) {
                const parsedVitals = typeof res.medicalRecord.vitals === 'string'
                  ? JSON.parse(res.medicalRecord.vitals)
                  : res.medicalRecord.vitals;
                setVitals({
                  bp: parsedVitals.bp || '120/80',
                  pulse: parsedVitals.pulse || '72',
                  temp: parsedVitals.temp || '98.6',
                  weight_kg: parsedVitals.weight_kg || '70',
                });
              }
            } else {
              setSymptoms(appointment.reason || '');
              setDiagnosis('');
              setDoctorNotes('');
              setVitals({ bp: '120/80', pulse: '72', temp: '98.6', weight_kg: '70' });
            }

            if (res.prescriptions && res.prescriptions.length > 0) {
              setPrescriptions(res.prescriptions);
            } else {
              setPrescriptions([
                {
                  medicine_name: '',
                  dosage: '500mg',
                  frequency: '1-0-1',
                  duration: '5 days',
                  instructions: 'Take after meals',
                },
              ]);
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load consultation details:', err);
        })
        .finally(() => setInitialLoading(false));
    }
  }, [isOpen, appointment]);

  if (!isOpen || !appointment) return null;

  // Add prescription line
  const handleAddPrescriptionRow = () => {
    setPrescriptions([
      ...prescriptions,
      {
        medicine_name: '',
        dosage: '500mg',
        frequency: '1-0-1',
        duration: '5 days',
        instructions: 'Take after meals',
      },
    ]);
  };

  // Remove prescription line
  const handleRemovePrescriptionRow = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  // Update prescription field
  const handlePrescriptionChange = (index, field, value) => {
    const updated = [...prescriptions];
    updated[index][field] = value;
    setPrescriptions(updated);
  };

  // Submit consultation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!diagnosis.trim()) {
      setError('Clinical diagnosis is required before completing the consultation.');
      return;
    }

    setLoading(true);
    try {
      // Filter out empty prescription rows
      const validPrescriptions = prescriptions.filter(
        (rx) => rx.medicine_name && rx.medicine_name.trim().length > 0
      );

      await doctorService.saveConsultation(appointment.id, {
        symptoms,
        diagnosis,
        doctor_notes: doctorNotes,
        vitals,
        prescriptions: validPrescriptions,
      });

      onConsultationSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save consultation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Clinical Consultation & Rx</h3>
              <p className="text-xs text-teal-100 font-mono">
                Appointment #{appointment.appointment_number} • {appointment.appointment_date} ({appointment.appointment_time})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Summary Header */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-semibold text-slate-500">Patient: </span>
            <span className="font-bold text-slate-900 text-sm ml-1">{appointment.patient_name}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500">Phone: </span>
            <span className="font-mono text-slate-800">{appointment.patient_phone}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500">Blood Group: </span>
            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {appointment.blood_group || 'O+'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-slate-500">Gender: </span>
            <span className="font-medium text-slate-800 capitalize">{appointment.gender || 'Not specified'}</span>
          </div>
        </div>

        {/* Body */}
        {initialLoading ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            Loading consultation history...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Clinical Vitals */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-500" /> Patient Vitals
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Blood Pressure</label>
                  <input
                    type="text"
                    value={vitals.bp}
                    onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                    placeholder="120/80 mmHg"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Pulse (bpm)</label>
                  <input
                    type="text"
                    value={vitals.pulse}
                    onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                    placeholder="72"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Temp (°F)</label>
                  <input
                    type="text"
                    value={vitals.temp}
                    onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                    placeholder="98.6"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Weight (kg)</label>
                  <input
                    type="text"
                    value={vitals.weight_kg}
                    onChange={(e) => setVitals({ ...vitals, weight_kg: e.target.value })}
                    placeholder="70"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. Symptoms & Diagnosis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Symptoms & Chief Complaints
                </label>
                <textarea
                  rows={2}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Mild chest tightness on exertion, intermittent shortness of breath..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Diagnosis *
                </label>
                <textarea
                  rows={2}
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Stage 1 Essential Hypertension, Sinus Tachycardia"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none font-semibold text-teal-900"
                />
              </div>
            </div>

            {/* 3. Clinical Advice / Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor's Clinical Advice & Lifestyle Recommendations
              </label>
              <textarea
                rows={2}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="e.g. Low sodium diet, 30 min brisk walk daily, follow-up in 4 weeks with fresh lipid profile..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
            </div>

            {/* 4. Prescription Medication Builder */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-teal-600" /> Prescribed Medications
                </label>
                <button
                  type="button"
                  onClick={handleAddPrescriptionRow}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 bg-white border border-teal-200 px-2.5 py-1 rounded-lg shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Medicine
                </button>
              </div>

              <div className="space-y-2.5">
                {prescriptions.map((rx, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={rx.medicine_name}
                          onChange={(e) => handlePrescriptionChange(idx, 'medicine_name', e.target.value)}
                          placeholder="Medicine name (e.g. Amlodipine, Paracetamol)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={rx.dosage}
                          onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                          placeholder="Dosage (e.g. 5mg, 500mg)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <div>
                        <input
                          type="text"
                          value={rx.frequency}
                          onChange={(e) => handlePrescriptionChange(idx, 'frequency', e.target.value)}
                          placeholder="Frequency (e.g. 1-0-1, Once daily)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={rx.duration}
                          onChange={(e) => handlePrescriptionChange(idx, 'duration', e.target.value)}
                          placeholder="Duration (e.g. 5 days, 30 days)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rx.instructions}
                          onChange={(e) => handlePrescriptionChange(idx, 'instructions', e.target.value)}
                          placeholder="Instructions (e.g. After meals)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                        />
                        {prescriptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePrescriptionRow(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Remove Medicine"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? 'Recording Consultation...' : 'Save & Mark Consultation Complete'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

