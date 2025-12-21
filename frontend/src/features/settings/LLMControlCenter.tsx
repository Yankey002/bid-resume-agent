import React, { useEffect, useState, useCallback } from 'react';
import { Card, Form, Select, Input, Button, message, Spin, Alert, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';

interface LLMConfigValues {
  model: string;
  prompt_template: string;
}

const LLMControlCenter: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await api.get<string[]>('/llm/models');
      setModels(res.data);
      // 如果当前表单没有值，或者当前值不在列表中，可以考虑默认选中第一个
    } catch {
      message.error('获取模型列表失败，请检查 Ollama 服务');
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/llm/config');
      form.setFieldsValue(res.data);
    } catch {
      message.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchModels();
    fetchConfig();
  }, [fetchModels, fetchConfig]);

  const handleRefreshModels = () => {
      fetchModels();
      message.success('已刷新模型列表');
  };

  const onFinish = async (values: LLMConfigValues) => {
    setLoading(true);
    try {
      await api.post('/llm/config', values);
      message.success('配置已保存');
    } catch {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="大模型控制中心" bordered={false}>
      <Alert
        message="配置说明"
        description="此处配置全局通用的大模型参数，将影响简历解析、信息提取等功能。请确保本地 Ollama 服务已启动 (默认端口 11434)。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="选择模型"
            required
            extra="请确保本地 Ollama 服务已启动且已下载对应模型"
          >
            <Space style={{ width: '100%' }}>
                <Form.Item
                    name="model"
                    noStyle
                    rules={[{ required: true, message: '请选择一个模型' }]}
                >
                    <Select
                    placeholder="选择本地模型"
                    loading={modelsLoading}
                    options={models.map(m => ({ label: m, value: m }))}
                    showSearch
                    style={{ width: 300 }}
                    />
                </Form.Item>
                <Button icon={<ReloadOutlined />} onClick={handleRefreshModels} loading={modelsLoading}>刷新列表</Button>
            </Space>
          </Form.Item>

          <Form.Item
            name="prompt_template"
            label="文件名识别姓名 - 提示词模板"
            rules={[{ required: true, message: '请输入提示词模板' }]}
            extra="使用 {filename} 作为文件名的占位符"
          >
            <Input.TextArea rows={6} placeholder="请输入 Prompt..." />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
};

export default LLMControlCenter;
