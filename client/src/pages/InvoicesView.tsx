import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Receipt, CheckCircle2, CreditCard, Clock, Plus, ArrowRight } from 'lucide-react';

export const InvoicesView: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    try {
      setLoading(true);
      const data = await api.getInvoices();
      setInvoices(data || []);
    } catch (e) {
      console.error('Failed to load invoices:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenPaymentModal = (inv: any) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.balanceAmount);
    setReference(`PAY-${Date.now().toString().slice(-6)}`);
    setNotes('');
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      setProcessing(true);
      await api.recordPayment(selectedInvoice.id, {
        amount: paymentAmount,
        paymentMethod,
        reference,
        notes,
      });

      alert(`Payment of ₹${paymentAmount} recorded successfully! Invoice updated.`);
      setSelectedInvoice(null);
      loadInvoices();
    } catch (e: any) {
      alert('Payment recording failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-onyx flex items-center gap-2">
          <Receipt className="w-5 h-5 text-signal" />
          Invoices & Payment Reconciliation Engine
        </h2>
        <p className="text-xs text-graphite">One-time and recurring commercial invoices, payment balance tracking & receipts</p>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-ash rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-fog text-charcoal uppercase font-semibold text-[10px]">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Issue / Due Date</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5">Paid Amount</th>
                <th className="p-3.5">Outstanding Balance</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ash text-charcoal">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-whisper">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-whisper">No invoices generated yet. Confirm a quote to generate invoices.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-fog/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-signal">{inv.invoiceNumber}</td>
                    <td className="p-3.5 font-semibold text-onyx">{inv.customer?.name}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] bg-fog text-charcoal border border-ash px-2 py-0.5 rounded font-mono font-semibold">
                        {inv.type}
                      </span>
                    </td>
                    <td className="p-3.5 text-graphite font-mono">
                      {new Date(inv.issueDate).toLocaleDateString()} / {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-onyx">₹{inv.totalAmount?.toFixed(2)}</td>
                    <td className="p-3.5 font-mono text-emerald-600">₹{inv.paidAmount?.toFixed(2)}</td>
                    <td className="p-3.5 font-mono font-bold text-amber-600">₹{inv.balanceAmount?.toFixed(2)}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        inv.status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-fog text-charcoal border border-ash'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {inv.balanceAmount > 0 && (
                        <button
                          onClick={() => handleOpenPaymentModal(inv)}
                          className="btn-primary inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white border border-ash rounded-xl max-w-md w-full p-6 space-y-4 shadow-floating">
            <div className="flex items-center justify-between border-b border-ash pb-3">
              <div>
                <h3 className="text-lg font-bold text-onyx">Record Payment</h3>
                <p className="text-xs text-graphite">Invoice: {selectedInvoice.invoiceNumber} ({selectedInvoice.customer?.name})</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-whisper hover:text-onyx">✕</button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div className="p-3 bg-fog rounded-lg border border-ash flex justify-between text-xs font-mono">
                <span className="text-graphite">Outstanding Balance:</span>
                <span className="font-bold text-amber-600">₹{selectedInvoice.balanceAmount?.toFixed(2)}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Payment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.balanceAmount}
                  value={paymentAmount}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="input rounded-lg px-3 py-2 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input rounded-lg px-3 py-2 text-xs"
                >
                  <option value="CREDIT_CARD">Credit Card / Wire Transfer</option>
                  <option value="BANK_TRANSFER">ACH Bank Transfer</option>
                  <option value="CHECK">Corporate Check</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-charcoal">Transaction Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="input rounded-lg px-3 py-2 text-xs font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="btn-ghost px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  {processing ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
