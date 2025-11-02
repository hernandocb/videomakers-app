import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';

const AdminConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    taxa_comissao: 0.20,
    valor_hora_base: 120.0,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await adminAPI.getConfig();
      setConfig(data);
      setFormData({
        taxa_comissao: data.taxa_comissao,
        valor_hora_base: data.valor_hora_base,
      });
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await adminAPI.updateConfig(formData);
      toast.success('✅ Configurações atualizadas com sucesso!');
      fetchConfig();
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-config">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações da Plataforma</h1>
        <p className="text-gray-600 mt-1">Ajustar parâmetros de negócio</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Configurações */}
        <Card>
          <CardHeader>
            <CardTitle>Parâmetros Financeiros</CardTitle>
            <CardDescription>
              Altere a taxa de comissão e o valor base por hora
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="taxa_comissao">Taxa de Comissão (%)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="taxa_comissao"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.taxa_comissao}
                    onChange={(e) =>
                      setFormData({ ...formData, taxa_comissao: parseFloat(e.target.value) })
                    }
                    required
                  />
                  <span className="text-sm text-gray-500">
                    = {(formData.taxa_comissao * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Percentual retido pela plataforma em cada transação (0.01 = 1%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_hora_base">Valor por Hora Base (R$)</Label>
                <Input
                  id="valor_hora_base"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_hora_base}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_hora_base: parseFloat(e.target.value) })
                  }
                  required
                />
                <p className="text-xs text-gray-500">
                  Valor base usado no cálculo automático do valor mínimo de jobs
                </p>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview de Cálculos */}
        <Card>
          <CardHeader>
            <CardTitle>Preview de Cálculo</CardTitle>
            <CardDescription>
              Veja como os valores são calculados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Exemplo: Job de 8 horas</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor base (8h):</span>
                  <span className="font-medium">
                    R$ {(formData.valor_hora_base * 8).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Drone:</span>
                  <span className="font-medium">R$ 100,00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Edição avançada:</span>
                  <span className="font-medium">R$ 150,00</span>
                </div>
                <div className="border-t border-blue-200 pt-2 flex justify-between">
                  <span className="text-gray-900 font-semibold">Valor Mínimo:</span>
                  <span className="text-green-600 font-bold">
                    R$ {(formData.valor_hora_base * 8 + 100 + 150).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Exemplo: Comissão</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor total pago:</span>
                  <span className="font-medium">R$ 1.500,00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Comissão ({(formData.taxa_comissao * 100).toFixed(0)}%):
                  </span>
                  <span className="font-medium text-green-600">
                    R$ {(1500 * formData.taxa_comissao).toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-green-200 pt-2 flex justify-between">
                  <span className="text-gray-900 font-semibold">Videomaker recebe:</span>
                  <span className="text-blue-600 font-bold">
                    R$ {(1500 - 1500 * formData.taxa_comissao).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Informações</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Valores atualizados em tempo real</li>
                <li>• Afeta novos jobs criados</li>
                <li>• Não altera jobs existentes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuração Atual */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Taxa de Comissão</p>
              <p className="text-2xl font-bold text-gray-900">
                {(config?.taxa_comissao * 100).toFixed(0)}%
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Valor/Hora Base</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {config?.valor_hora_base.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Última Atualização</p>
              <p className="text-sm font-medium text-gray-900">
                {config?.updated_by || 'system'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminConfig;
