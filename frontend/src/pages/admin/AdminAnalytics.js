import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminAnalytics = () => {
  const [growthData, setGrowthData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [conversionData, setConversionData] = useState(null);
  const [topPerformers, setTopPerformers] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    fetchAllAnalytics();
    // Atualizar dados em tempo real a cada 30 segundos
    const interval = setInterval(fetchRealTime, 30000);
    return () => clearInterval(interval);
  }, [months]);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const [growth, revenue, conversion, performers, realtime] = await Promise.all([
        adminAPI.getGrowthAnalytics(months),
        adminAPI.getRevenueAnalytics(months),
        adminAPI.getConversionAnalytics(),
        adminAPI.getTopPerformers(10),
        adminAPI.getRealTimeAnalytics()
      ]);

      setGrowthData(growth.data);
      setRevenueData(revenue.data);
      setConversionData(conversion.data);
      setTopPerformers(performers.data);
      setRealTimeData(realtime.data);
    } catch (error) {
      toast.error('Erro ao carregar analytics');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTime = async () => {
    try {
      const { data } = await adminAPI.getRealTimeAnalytics();
      setRealTimeData(data);
    } catch (error) {
      console.error('Erro ao atualizar dados em tempo real:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Preparar dados para gráficos
  const usersGrowthChart = growthData?.users_growth?.map(item => ({
    month: item._id,
    Clientes: item.clients,
    Videomakers: item.videomakers,
    Total: item.total
  })) || [];

  const jobsGrowthChart = growthData?.jobs_growth?.map(item => ({
    month: item._id,
    Total: item.total,
    Concluídos: item.completed
  })) || [];

  const revenueChart = revenueData?.monthly_revenue?.map(item => ({
    month: item._id,
    'Valor Total': item.total_valor,
    'Comissão Plataforma': item.total_comissao,
    'Valor Videomaker': item.total_videomaker,
    'Transações': item.count
  })) || [];

  const conversionPieData = [
    { name: 'Aceitas', value: conversionData?.proposals?.accepted || 0 },
    { name: 'Pendentes', value: conversionData?.proposals?.pending || 0 },
    { name: 'Rejeitadas', value: conversionData?.proposals?.rejected || 0 }
  ];

  return (
    <div className="space-y-6" data-testid="admin-analytics">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Avançado</h1>
          <p className="text-gray-600 mt-1">Métricas e insights detalhados da plataforma</p>
        </div>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={3}>Últimos 3 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Últimos 12 meses</option>
          <option value={24}>Últimos 24 meses</option>
        </select>
      </div>

      {/* Real-Time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Usuários Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{realTimeData?.today?.users || 0}</div>
            <p className="text-xs text-blue-100 mt-1">
              Média 7 dias: {realTimeData?.last_7_days?.avg_users_per_day || 0}/dia
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100">Jobs Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{realTimeData?.today?.jobs || 0}</div>
            <p className="text-xs text-green-100 mt-1">
              Média 7 dias: {realTimeData?.last_7_days?.avg_jobs_per_day || 0}/dia
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">Propostas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{realTimeData?.today?.proposals || 0}</div>
            <p className="text-xs text-purple-100 mt-1">Enviadas hoje</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-100">Pagamentos Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{realTimeData?.today?.payments || 0}</div>
            <p className="text-xs text-yellow-100 mt-1">Transações</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-100">Receita Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ {realTimeData?.today?.revenue?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-red-100 mt-1">Comissões liberadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Crescimento de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={usersGrowthChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="Clientes" stackId="1" stroke="#3B82F6" fill="#3B82F6" />
                <Area type="monotone" dataKey="Videomakers" stackId="1" stroke="#10B981" fill="#10B981" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jobs Criados vs Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={jobsGrowthChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Total" stroke="#8B5CF6" strokeWidth={2} />
                <Line type="monotone" dataKey="Concluídos" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Receita Mensal Detalhada</CardTitle>
          <p className="text-sm text-gray-500">
            Total de comissões: R$ {revenueData?.summary?.total_commission?.toFixed(2) || '0.00'} | 
            Valor médio por transação: R$ {revenueData?.summary?.avg_transaction_value?.toFixed(2) || '0.00'}
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Valor Total" fill="#3B82F6" />
              <Bar dataKey="Comissão Plataforma" fill="#EF4444" />
              <Bar dataKey="Valor Videomaker" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversion Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={conversionPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {conversionPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-4">
              <p className="text-2xl font-bold text-green-600">
                {conversionData?.proposals?.conversion_rate?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-500">Taxa de Aceitação</p>
            </div>
          </CardContent>
        </Card>

        {/* Top Videomakers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Videomakers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {topPerformers?.top_videomakers?.slice(0, 5).map((vm, idx) => (
                <div key={vm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{vm.nome}</p>
                      <p className="text-xs text-gray-500">⭐ {vm.rating?.toFixed(1)} ({vm.total_reviews} avaliações)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{vm.jobs_completed} jobs</p>
                    <p className="text-xs text-gray-500">R$ {vm.total_earned?.toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {topPerformers?.top_clients?.slice(0, 5).map((client, idx) => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{client.nome}</p>
                      <p className="text-xs text-gray-500">{client.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{client.jobs_created} jobs</p>
                    <p className="text-xs text-gray-500">{client.jobs_completed} concluídos</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Engajamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Taxa de Engajamento de Jobs</p>
              <p className="text-2xl font-bold text-blue-600">
                {conversionData?.engagement?.engagement_rate?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-500">
                {conversionData?.engagement?.jobs_with_proposals || 0} de {conversionData?.engagement?.total_jobs || 0} jobs receberam propostas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Propostas Totais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total</span>
              <span className="font-bold">{conversionData?.proposals?.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-green-600">Aceitas</span>
              <span className="font-bold text-green-600">{conversionData?.proposals?.accepted || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-yellow-600">Pendentes</span>
              <span className="font-bold text-yellow-600">{conversionData?.proposals?.pending || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-red-600">Rejeitadas</span>
              <span className="font-bold text-red-600">{conversionData?.proposals?.rejected || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Transações</span>
              <span className="font-bold">{revenueData?.summary?.total_transactions || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Comissões</span>
              <span className="font-bold text-green-600">R$ {revenueData?.summary?.total_commission?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Ticket Médio</span>
              <span className="font-bold text-blue-600">R$ {revenueData?.summary?.avg_transaction_value?.toFixed(2) || '0.00'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
