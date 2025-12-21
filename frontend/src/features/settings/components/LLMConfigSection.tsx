import React from 'react';
import { Form, Select, Input, Button, Space, Card, Row, Col, Tooltip } from 'antd';
import { ReloadOutlined, UndoOutlined, QuestionCircleOutlined } from '@ant-design/icons';

interface LLMConfigSectionProps {
  title: string;
  description?: string;
  models: string[];
  modelsLoading: boolean;
  onRefreshModels: () => void;

  // Data
  modelValue?: string;
  promptValue?: string;
  defaultPrompt?: string;
  promptLabel?: React.ReactNode;

  // Handlers
  onModelChange: (val: string) => void;
  onPromptChange: (val: string) => void;

  // Optional extras
  extraContent?: React.ReactNode;
}

/**
 * 通用 LLM 配置区块
 * - 统一提供模型选择、提示词编辑、默认提示词重置
 */
export const LLMConfigSection: React.FC<LLMConfigSectionProps> = ({
  title,
  description,
  models,
  modelsLoading,
  onRefreshModels,
  modelValue,
  promptValue,
  defaultPrompt,
  promptLabel,
  onModelChange,
  onPromptChange,
  extraContent
}) => {
  /** 重置提示词为默认值 */
  const handleResetPrompt = () => {
    if (defaultPrompt && onPromptChange) {
      onPromptChange(defaultPrompt);
    }
  };

  return (
    <Card
      type="inner"
      title={
        <Space>
          {title}
          {description && (
            <Tooltip title={description}>
              <QuestionCircleOutlined style={{ color: 'rgba(0,0,0,0.45)', cursor: 'help' }} />
            </Tooltip>
          )}
        </Space>
      }
      style={{ marginBottom: 24 }}
      size="small"
    >
      <Form layout="vertical">
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="选择模型" required tooltip="请选择用于此功能的 Ollama 本地模型">
              <Space style={{ width: '100%' }}>
                <Select
                  placeholder="选择本地模型"
                  loading={modelsLoading}
                  options={models.map(m => ({ label: m, value: m }))}
                  showSearch
                  style={{ width: 240 }}
                  value={modelValue}
                  onChange={onModelChange}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={onRefreshModels}
                  loading={modelsLoading}
                  type="text"
                />
              </Space>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label={
            <Space>
              <span>{promptLabel || "提示词模板"}</span>
              {defaultPrompt && (
                <Tooltip title="重置为默认提示词">
                  <Button
                    type="link"
                    size="small"
                    icon={<UndoOutlined />}
                    onClick={handleResetPrompt}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    重置
                  </Button>
                </Tooltip>
              )}
            </Space>
          }
          required
        >
          <Input.TextArea
            rows={4}
            value={promptValue}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="请输入提示词..."
          />
        </Form.Item>

        {extraContent}
      </Form>
    </Card>
  );
};
