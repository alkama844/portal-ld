'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Search, 
  Receipt,
  Clock,
  Eye,
  AlertCircle,
  Activity
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/client';
import { DashboardStats, Patient, Appointment } from '@patient-portal/shared';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await apiFetch<DashboardStats>('/dashboard/stats');
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch {
        // graceful fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  const totalPatients = stats?.totalPatients || 0;
  const todayAppointments = stats?.todayAppointments || 0;
  const upcomingAppointments = stats?.upcomingAppointments || 0;
  const todayRevenue = stats?.todayRevenue || 0;
  const totalRevenue = stats?.totalRevenue || 0;
  const pendingDue = stats?.pendingDue || 0;
  const recentPatients: Patient[] = stats?.recentPatients || [];
  const recentAppointments: Appointment[] = stats?.recentAppointments || [];

  const statsCards = [
    {
      title: 'Total Patients',
      value: totalPatients.toLocaleString(),
      change: 'Active clinic records',
      icon: Users,
      glow: true
    },
    {
      title: "Today's Visits",
      value: todayAppointments.toString(),
      change: `${upcomingAppointments} total upcoming`,
      icon: Calendar,
      glow: false
    },
    {
      title: 'Pending Due Amount',
      value: `৳${pendingDue.toLocaleString('en-BD')}`,
      change: pendingDue > 0 ? 'Collect upon next visit' : 'All accounts settled',
      icon: Clock,
      glow: pendingDue > 0
    },
    {
      title: "Today's Revenue",
      value: `৳${todayRevenue.toLocaleString('en-BD')}`,
      change: `৳${totalRevenue.toLocaleString('en-BD')} all-time`,
      icon: DollarSign,
      glow: true
    }
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Luckydental Dashboard</h2>
            <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-700/50 text-red-400 text-[10px] font-bold uppercase tracking-wider">
              Live
            </span>
          </div>
          <p className="text-xs text-gray-400">Clinic performance, dental visits, and financial summary</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/patients">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Search className="w-3.5 h-3.5" />
              Patient Lookup
            </Button>
          </Link>
          <Link href="/patients/new">
            <Button variant="primary" size="sm" className="gap-2 text-xs shadow-glow-red">
              <Plus className="w-3.5 h-3.5" />
              New Patient
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={idx} glow={stat.glow} hoverEffect className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{stat.title}</p>
                  <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">{stat.value}</h3>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-900/60 to-red-950/80 border border-red-700/30 text-red-400 shadow-glow-red-sm">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3.5 flex items-center gap-1 text-xs text-red-400 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{stat.change}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Main Grid: Recent Patients & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-400" />
              Recent Patients
            </h3>
            <Link href="/patients" className="text-xs text-red-400 hover:underline">
              View All Patients
            </Link>
          </div>

          <GlassCard className="p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading patient records...</div>
            ) : recentPatients.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Users className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="text-xs text-gray-400">No patients registered in database yet.</p>
                <Link href="/patients/new">
                  <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Register First Patient
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-gray-400 font-semibold uppercase">
                    <tr>
                      <th className="py-3.5 px-5">ID</th>
                      <th className="py-3.5 px-5">Patient Name</th>
                      <th className="py-3.5 px-5">Age</th>
                      <th className="py-3.5 px-5">Phone</th>
                      <th className="py-3.5 px-5">Dental Concern</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentPatients.map((patient) => (
                      <tr
                        key={patient.id || (patient as any)._id}
                        onClick={() => router.push(`/patients/${patient.patientNumber}`)}
                        className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-5 font-mono font-bold text-red-400">
                          #{patient.patientNumber}
                        </td>
                        <td className="py-3.5 px-5 font-semibold text-gray-200">{patient.fullName}</td>
                        <td className="py-3.5 px-5 text-gray-400">{patient.age} yrs</td>
                        <td className="py-3.5 px-5 text-gray-400 font-mono">{patient.phone}</td>
                        <td className="py-3.5 px-5 text-gray-300 max-w-xs truncate">{patient.patientProblem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Upcoming Appointments (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-400" />
              Upcoming Schedule
            </h3>
            <Link href="/appointments" className="text-xs text-red-400 hover:underline">
              Open Schedule
            </Link>
          </div>

          <GlassCard className="p-4 space-y-3">
            {recentAppointments.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 space-y-2">
                <Calendar className="w-8 h-8 text-gray-500 mx-auto" />
                <p>No appointments scheduled</p>
                <Link href="/appointments">
                  <Button variant="outline" size="sm" className="mt-2 text-xs">
                    Schedule Visit
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentAppointments.slice(0, 4).map((apt) => (
                  <div
                    key={apt.id || apt._id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-red-400">
                        {apt.appointmentDate} • {apt.appointmentTime}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-950/80 text-red-300 border border-red-800/40">
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-200">
                      #{apt.patientNumber} {apt.patientName}
                    </p>
                    <p className="text-[11px] text-gray-400">{apt.category}</p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
