import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

      const { data } = await adminAPI.getJobs(params);
      setJobs(data);
    } catch (error) {
      toast.error('Erro ao carregar jobs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      open: { variant: 'default', label: 'Aberto' },
      in_progress: { variant: 'secondary', label: 'Em Andamento' },
      completed: { variant: 'outline', label: 'Concluído' },
      cancelled: { variant: 'destructive', label: 'Cancelado' },
    };

    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="admin-jobs">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 mt-1">Todos os pedidos de gravação</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Valor Mínimo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Gravação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.titulo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{job.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      {job.local?.cidade}, {job.local?.estado}
                    </TableCell>
                    <TableCell>{job.duracao_horas}h</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      R$ {job.valor_minimo.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>
                      {format(new Date(job.data_gravacao), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        Total: {jobs.length} jobs
      </div>
    </div>
  );
};

export default AdminJobs;
