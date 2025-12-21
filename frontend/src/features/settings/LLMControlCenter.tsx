import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, message, Spin, Tooltip } from 'antd';
import { QuestionCircleOutlined, SaveOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { LLMConfigSection } from './components/LLMConfigSection';

// Define defaults to match backend
const DEFAULT_RESUME_PROMPT = "请从以下文件名中提取候选人姓名，只返回姓名，不要包含其他字符。文件名：{filename}";
const DEFAULT_TEMPLATE_PROMPT =
  "你是 Word 模板标注助手。你的任务是：在模板中需要填写候选人信息的位置，插入占位符，格式为[变量名]。" +
  "\n\n规则：" +
  "\n1) 不改动任何固定文案与标题，只在需要填写内容的位置插入占位符。" +
  "\n2) 占位符用方括号包裹，例如：姓名位置插入[姓名]，手机号位置插入[手机号]。" +
  "\n3) 对于列举式/重复填写的模块（如项目经历、证书、工作经历），请标注两组示例：字段名后加序号1/2，例如[项目名称1]、[项目名称2]。" +
  "\n4) 对于表格：每个需要填写的单元格都必须放入对应占位符；表头不改。" +
  "\n5) 输出仅包含标注后的结果，不要添加额外解释。";
const DEFAULT_MODEL = "qwen2.5:7b-instruct";

interface ModuleConfig {
  model: string;
  prompt: string;
}

interface LLMConfig {
  resume_parsing: ModuleConfig;
  template_annotation: ModuleConfig;
}

/**
 * 大模型控制中心
 * - 文件名识别配置：用于导入简历时从文件名提取候选人姓名
 * - 模板标注配置：用于在模板 Word 中插入[变量名]占位符
 */
const LLMControlCenter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const [config, setConfig] = useState<LLMConfig>({
    resume_parsing: { model: DEFAULT_MODEL, prompt: DEFAULT_RESUME_PROMPT },
    template_annotation: { model: DEFAULT_MODEL, prompt: DEFAULT_TEMPLATE_PROMPT }
  });

  /** 获取本地 Ollama 模型列表 */
  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await api.get<string[]>('/llm/models');
      setModels(res.data);
    } catch {
      message.error('获取模型列表失败，请检查 Ollama 服务');
    } finally {
      setModelsLoading(false);
    }
  }, []);

  /** 获取后端保存的配置 */
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<LLMConfig>('/llm/config');
      // The backend now returns nested structure, so we can set directly
      // But we should ensure we have the structure to avoid undefined errors if backend returns partial
      const data = res.data;
      setConfig({
        resume_parsing: data.resume_parsing || { model: DEFAULT_MODEL, prompt: DEFAULT_RESUME_PROMPT },
        template_annotation: data.template_annotation || { model: DEFAULT_MODEL, prompt: DEFAULT_TEMPLATE_PROMPT }
      });
    } catch {
      message.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    fetchConfig();
  }, [fetchModels, fetchConfig]);

  /** 保存全部模块配置 */
  const handleSave = async () => {
      setLoading(true);
      try {
          await api.post('/llm/config', config);
          message.success('配置已保存');
      } catch {
          message.error('保存失败');
      } finally {
          setLoading(false);
      }
  };

  /** 更新指定模块的字段值 */
  const updateModuleConfig = (module: keyof LLMConfig, field: keyof ModuleConfig, value: string) => {
      setConfig(prev => ({
          ...prev,
          [module]: {
              ...prev[module],
              [field]: value
          }
      }));
  };

  return (
    <Card
        title={
            <span>
                大模型控制中心
                <Tooltip title="此处配置全局通用的大模型参数，将影响简历解析、信息提取等功能。请确保本地 Ollama 服务已启动 (默认端口 11434)。">
                    <QuestionCircleOutlined style={{ marginLeft: 8, color: 'rgba(0,0,0,0.45)', cursor: 'help' }} />
                </Tooltip>
            </span>
        }
        bordered={false}
        extra={
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={loading}>
                保存所有配置
            </Button>
        }
    >
        <Spin spinning={loading}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <LLMConfigSection
                    title="文件名识别配置 (导入简历)"
                    description="用于从文件名自动提取候选人姓名"
                    models={models}
                    modelsLoading={modelsLoading}
                    onRefreshModels={fetchModels}
                    modelValue={config.resume_parsing.model}
                    promptValue={config.resume_parsing.prompt}
                    defaultPrompt={DEFAULT_RESUME_PROMPT}
                    promptLabel="文件名识别姓名 - 提示词模板"
                    onModelChange={(val) => updateModuleConfig('resume_parsing', 'model', val)}
                    onPromptChange={(val) => updateModuleConfig('resume_parsing', 'prompt', val)}
                />

                <LLMConfigSection
                    title="模板标注配置"
                    description="用于在模板 Word 原文中插入[变量名]占位符标注"
                    models={models}
                    modelsLoading={modelsLoading}
                    onRefreshModels={fetchModels}
                    modelValue={config.template_annotation.model}
                    promptValue={config.template_annotation.prompt}
                    defaultPrompt={DEFAULT_TEMPLATE_PROMPT}
                    onModelChange={(val) => updateModuleConfig('template_annotation', 'model', val)}
                    onPromptChange={(val) => updateModuleConfig('template_annotation', 'prompt', val)}
                />
            </div>
        </Spin>
    </Card>
  );
};

export default LLMControlCenter;
