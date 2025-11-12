import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle, XCircle, Wrench } from 'lucide-react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { VendingMachine } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast from 'react-hot-toast';

export default function MachineStatusPage() {
  const [machines, setMachines] = useState<VendingMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<VendingMachine | null>(null);
  const [testSlot, setTestSlot] = useState('');
  const [testProductId, setTestProductId] = useState('');
  const [testingDispense, setTestingDispense] = useState(false);

  useEffect(() => {
    const machinesQuery = query(collection(db, 'vendingMachines'));

    const unsubscribe = onSnapshot(machinesQuery, (snapshot) => {
      const machinesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        lastHeartbeat: doc.data().lastHeartbeat?.toDate(),
      })) as VendingMachine[];

      setMachines(machinesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getMachineStatus = (machine: VendingMachine): 'online' | 'offline' | 'warning' => {
    if (!machine.lastHeartbeat) return 'offline';

    const now = new Date();
    const diff = now.getTime() - machine.lastHeartbeat.getTime();
    const minutesAgo = diff / 1000 / 60;

    if (minutesAgo < 5) return 'online';
    if (minutesAgo < 15) return 'warning';
    return 'offline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-amber-600 bg-amber-100';
      case 'offline':
        return 'text-red-600 bg-red-100';
      case 'maintenance':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'offline':
        return <XCircle className="w-5 h-5" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const handleManualDispenseTest = async () => {
    if (!selectedMachine || !testSlot || !testProductId) {
      toast.error('Please fill in all fields');
      return;
    }

    setTestingDispense(true);
    try {
      const functions = getFunctions();
      const manualDispenseTest = httpsCallable(functions, 'manualDispenseTest');

      const result = await manualDispenseTest({
        vendingMachineId: selectedMachine.id,
        productId: testProductId,
        slot: parseInt(testSlot),
      });

      toast.success('Test dispense initiated! Check the machine.');
      setTestSlot('');
      setTestProductId('');
      setSelectedMachine(null);
    } catch (error: any) {
      console.error('Manual dispense test failed:', error);
      toast.error(error.message || 'Failed to initiate test dispense');
    } finally {
      setTestingDispense(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading machines...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Machines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {machines.map((machine) => {
            const status = getMachineStatus(machine);
            return (
              <motion.div
                key={machine.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-2xl p-6 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedMachine(machine)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{machine.name}</h3>
                    <p className="text-sm text-gray-600">{machine.location}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-semibold capitalize ${status === 'online' ? 'text-green-600' : status === 'warning' ? 'text-amber-600' : 'text-red-600'}`}>
                      {status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last Heartbeat</span>
                    <span className="font-medium text-gray-900">
                      {machine.lastHeartbeat
                        ? new Date(machine.lastHeartbeat).toLocaleTimeString()
                        : 'Never'}
                    </span>
                  </div>

                  {machine.currentSessionId && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600 font-medium">Active Session</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Manual Dispense Test Section */}
        <div className="glass-strong rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Manual Dispense Test</h2>

          {selectedMachine ? (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>Selected Machine:</strong> {selectedMachine.name} ({selectedMachine.location})
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slot Number
                  </label>
                  <input
                    type="number"
                    value={testSlot}
                    onChange={(e) => setTestSlot(e.target.value)}
                    placeholder="e.g., 11"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product ID
                  </label>
                  <input
                    type="text"
                    value={testProductId}
                    onChange={(e) => setTestProductId(e.target.value)}
                    placeholder="Product ID from inventory"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedMachine(null)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualDispenseTest}
                  disabled={testingDispense}
                  className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingDispense ? 'Testing...' : 'Test Dispense'}
                </button>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-900">
                  <strong>Note:</strong> This will create a test dispense event that will be processed by the vending machine.
                  Make sure the machine is online and the slot number is correct.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Select a machine above to test dispensing</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
