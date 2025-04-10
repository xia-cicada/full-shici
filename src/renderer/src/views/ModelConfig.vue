<script setup lang="ts">
import { NFlex, NButton, type DataTableColumns } from 'naive-ui'
import type { ModelConfig } from '@main/ai/types'
import { toDeepRaw } from '@/utils'

const message = useMessage()

// 状态管理
const configs = ref<ModelConfig[]>([])
const showModal = ref(false)
const isEditing = ref(false)
const currentConfig = ref<Partial<ModelConfig>>({
  name: '',
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  temperature: 0.7,
  systemPrompt: '',
  maxTokens: 2048,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  isDefault: 0
})

// 加载配置列表
const loadConfigs = async () => {
  try {
    configs.value = await window.electronAPI.ai.getAllModelConfigs()
  } catch (error) {
    message.error('加载配置失败')
    console.error(error)
  }
}

// 初始化加载
onMounted(() => {
  loadConfigs()
})

// 表格列定义
const columns: DataTableColumns<ModelConfig> = [
  { title: '名称', key: 'name' },
  { title: '供应商', key: 'provider' },
  { title: '模型名称', key: 'model' },
  { title: '温度', key: 'temperature', width: 80 },
  { title: '系统提示语', key: 'systemPrompt', ellipsis: { tooltip: true } },
  {
    title: '默认',
    key: 'isDefault',
    width: 80,
    render: (row) => h('span', { class: row.isDefault === 1 ? 'i-tabler-check' : '' })
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) =>
      h(NFlex, null, () => [
        h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            onClick: () => editConfig(row)
          },
          () => '编辑'
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            onClick: () => deleteConfig(row.id!)
          },
          () => '删除'
        )
      ])
  }
]

// 打开添加配置模态框
const openAddModal = () => {
  isEditing.value = false
  currentConfig.value = {
    name: '',
    provider: 'DeepSeek',
    model: 'deepseek-chat',
    apiKey: '',
    baseURL: 'https://api.deepseek.com',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    isDefault: 0
  }
  showModal.value = true
}

// 编辑配置
const editConfig = (config: ModelConfig) => {
  isEditing.value = true
  currentConfig.value = { ...config }
  showModal.value = true
}

// 保存配置
const saveConfig = async () => {
  const rawConfig = toDeepRaw(currentConfig.value)
  try {
    if (isEditing.value && rawConfig.id) {
      await window.electronAPI.ai.updateModelConfig(rawConfig.id, rawConfig)
      message.success('配置更新成功')
    } else {
      await window.electronAPI.ai.addModelConfig(rawConfig as ModelConfig)
      message.success('配置添加成功')
    }
    showModal.value = false
    loadConfigs()
  } catch (error) {
    message.error('保存配置失败')
    console.error(error)
  }
}

// 删除配置
const deleteConfig = async (id: number) => {
  try {
    const success = await window.electronAPI.ai.deleteModelConfig(id)
    if (success) {
      message.success('删除配置成功')
      loadConfigs()
    } else {
      message.error('删除配置失败')
    }
  } catch (error) {
    message.error('删除配置失败')
    console.error(error)
  }
}

const router = useRouter()
const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="p-4 box-border h-full flex flex-col">
    <div class="flex items-center mb-4 gap-2">
      <h1 class="text-2xl font-bold">模型配置管理</h1>
      <div class="ml-auto"></div>
      <NButton @click="goBack">返回</NButton>
      <NButton type="primary" @click="openAddModal">添加配置</NButton>
    </div>
    <div class="flex-1 overflow-hidden">
      <NDataTable
        :columns="columns"
        :data="configs"
        :bordered="true"
        style="height: 100%"
        flex-height
      />
    </div>

    <NModal
      v-model:show="showModal"
      preset="card"
      :title="isEditing ? '编辑配置' : '添加配置'"
      style="width: 600px"
    >
      <NForm :model="currentConfig" label-width="120px" label-placement="left">
        <n-collapse :default-expanded-names="['1']">
          <n-collapse-item title="基础配置" name="1">
            <NFormItem label="名称" required>
              <NInput v-model:value="currentConfig.name" placeholder="配置名称" />
            </NFormItem>

            <NFormItem label="供应商" required>
              <NInput v-model:value="currentConfig.provider" placeholder="配置供应商" />
            </NFormItem>

            <NFormItem label="模型名称" required>
              <NInput v-model:value="currentConfig.model" placeholder="配置模型名称" />
            </NFormItem>

            <NFormItem label="API Key" required>
              <NInput
                v-model:value="currentConfig.apiKey"
                placeholder="输入API Key"
                type="password"
                show-password-on="click"
              />
            </NFormItem>

            <NFormItem label="API地址" required>
              <NInput v-model:value="currentConfig.baseURL" placeholder="API基础地址" />
            </NFormItem>

            <NFormItem label="温度 (0-2)">
              <NInputNumber
                v-model:value="currentConfig.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                class="w-full"
              />
            </NFormItem>

            <NFormItem label="系统提示语">
              <NInput
                type="textarea"
                v-model:value="currentConfig.systemPrompt"
                placeholder="系统提示语"
              />
            </NFormItem>

            <NFormItem label="设为默认">
              <NSwitch
                :checked-value="1"
                :unchecked-value="0"
                v-model:value="currentConfig.isDefault"
              />
            </NFormItem>
          </n-collapse-item>

          <n-collapse-item title="高级配置" name="2">
            <NFormItem label="最大Token数">
              <NInputNumber v-model:value="currentConfig.maxTokens" :min="1" class="w-full" />
            </NFormItem>

            <NFormItem label="Top P (0-1)">
              <NInputNumber
                v-model:value="currentConfig.topP"
                :min="0"
                :max="1"
                :step="0.1"
                class="w-full"
              />
            </NFormItem>

            <NFormItem label="频率惩罚">
              <NInputNumber
                v-model:value="currentConfig.frequencyPenalty"
                :min="0"
                :max="2"
                :step="0.1"
                class="w-full"
              />
            </NFormItem>

            <NFormItem label="存在惩罚">
              <NInputNumber
                v-model:value="currentConfig.presencePenalty"
                :min="0"
                :max="2"
                :step="0.1"
                class="w-full"
              />
            </NFormItem>
          </n-collapse-item>
        </n-collapse>

        <div class="flex justify-end gap-2 mt-4">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" @click="saveConfig">保存</NButton>
        </div>
      </NForm>
    </NModal>
  </div>
</template>

<style lang="scss"></style>
