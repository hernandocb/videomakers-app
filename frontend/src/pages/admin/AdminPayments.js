import React, { useEffect, useState } from 'react';
import { adminAPI, paymentsAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getPayments();
      setPayments(data);
    } catch (error) {
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayment = async (paymentId) => {
    if (!window.confirm('Deseja liberar este pagamento?')) return;

    try {
      await paymentsAPI.release(paymentId);
      toast.success('Pagamento liberado com sucesso');
      fetchPayments();
    } catch (error) {
      toast.error('Erro ao liberar pagamento');
    }
  };

  const handleRefundPayment = async (paymentId) => {
    if (!window.confirm('Deseja reembolsar este pagamento?')) return;

    try {
      await paymentsAPI.refund(paymentId);
      toast.success('Pagamento reembolsado');
      fetchPayments();
    } catch (error) {
      toast.error('Erro ao reembolsar pagamento');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      held: { variant: 'secondary', label: 'Em Escrow', color: 'bg-yellow-100 text-yellow-800' },
      released: { variant: 'default', label: 'Liberado', color: 'bg-green-100 text-green-800' },
      refunded: { variant: 'destructive', label: 'Reembolsado', color: 'bg-red-100 text-red-800' },
      disputed: { variant: 'outline', label: 'Em Disputa', color: 'bg-orange-100 text-orange-800' },
    };

    const config = variants[status] || { variant: 'default', label: status, color: '' };
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-testid="admin-payments">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pagamentos</h1>
        <p className="text-gray-600 mt-1">Gerenciar transações e escrow</p>
      </div>

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
                  <TableHead>Job ID</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Videomaker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.job_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-semibold">
                      R$ {payment.valor_total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      R$ {payment.comissao_plataforma.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      R$ {payment.valor_videomaker.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {payment.status === 'held' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleReleasePayment(payment.id)}
                            >
                              Liberar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRefundPayment(payment.id)}
                            >
                              Reembolsar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        Total: {payments.length} pagamentos
      </div>
    </div>
  );
};

export default AdminPayments;
