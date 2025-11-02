import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';

const StatCard = ({ title, value, icon, color = 'blue', subtitle }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      <div className={`w-10 h-10 bg-${color}-100 rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await adminAPI.getStats();
      setStats(data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral da plataforma</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Usuários */}
        <StatCard
          title="Total de Usuários"
          value={stats?.users?.total || 0}
          subtitle={`${stats?.users?.clients || 0} clientes, ${stats?.users?.videomakers || 0} videomakers`}
          color="blue"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />

        {/* Jobs */}
        <StatCard
          title="Jobs"
          value={stats?.jobs?.total || 0}
          subtitle={`${stats?.jobs?.open || 0} abertos, ${stats?.jobs?.completed || 0} concluídos`}
          color="green"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
        />

        {/* Pagamentos */}
        <StatCard
          title="Pagamentos"
          value={stats?.payments?.total || 0}
          subtitle={`${stats?.payments?.held || 0} retidos, ${stats?.payments?.released || 0} liberados`}
          color="purple"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />

        {/* Receita */}
        <StatCard
          title="Receita (Comissões)"
          value={`R$ ${(stats?.revenue?.total_commission || 0).toFixed(2)}`}
          subtitle="Total de comissões liberadas"
          color="yellow"
          icon={
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Jobs por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Abertos</span>
                <span className="text-sm font-medium">{stats?.jobs?.open || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${((stats?.jobs?.open || 0) / (stats?.jobs?.total || 1)) * 100}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">Em Andamento</span>
                <span className="text-sm font-medium">{stats?.jobs?.in_progress || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${((stats?.jobs?.in_progress || 0) / (stats?.jobs?.total || 1)) * 100}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">Concluídos</span>
                <span className="text-sm font-medium">{stats?.jobs?.completed || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${((stats?.jobs?.completed || 0) / (stats?.jobs?.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Atividade Recente */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Em Escrow</p>
                  <p className="text-xs text-gray-500">Aguardando liberação</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">{stats?.payments?.held || 0}</p>
                  <p className="text-xs text-gray-500">pagamentos</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Liberados</p>
                  <p className="text-xs text-gray-500">Pagamentos concluídos</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{stats?.payments?.released || 0}</p>
                  <p className="text-xs text-gray-500">pagamentos</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Total</p>
                  <p className="text-xs text-gray-500">Todos os pagamentos</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{stats?.payments?.total || 0}</p>
                  <p className="text-xs text-gray-500">pagamentos</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
