const axios = require('axios');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

// 配置 Express 服务器
const app = express();
const PORT = 443; // 服务监听端口

// 启用 CORS
app.use(cors());

// 本地存储文件路径
const FILE_PATH = path.join(__dirname, './data.json');

// 缓存数据（用来代替频繁的文件读取）
let cacheData = [];

// 从网络接口获取数据函数
async function fetchHotlist() {
  try {
    const url = 'https://suoluosi.net/blockchain/getHotlist?page=1&limit=10';
    const response = await axios.get(url);
    if (response.data.code === 0 && response.data.data) {
      return response.data.data;
    } else {
      console.error('Unexpected response:', response.data);
      return [];
    }
  } catch (err) {
    console.error('Error while fetching data:', err);
    return [];
  }
}

// 将时间转为秒级时间戳
function toTimestampInSeconds(dateString) {
  return Math.floor(new Date(dateString).getTime() / 1000);
}

// 转换数据格式函数
function transformData(data) {
  return data.map((item) => {
    return {
      timestamp: toTimestampInSeconds(item['查询时间']),
      time: item['查询时间'],
      color: item['颜色'],
      contract: item['合约'],
      coinName: item['币名'],
      occurrences: item['次数'],
      groups: item['群数'],
      price: item['价格'],
      initialMarketCap: item['首发市值'],
      marketCap: item['市值'],
      top10Holdings: item['Top10持仓'],
      holders: item['持有人'],
      popularity: item['热度'],
      people: item['人数'],
    };
  });
}

// 将数据写入本地文件
function writeLocalData(data) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('Data successfully written to ./data.json');
  } catch (err) {
    console.error('Failed to write data:', err);
  }
}

// 读取本地数据文件（启动时加载）
function initializeCache() {
  if (fs.existsSync(FILE_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
      cacheData = Array.isArray(data) ? data : [];
      console.log('Cache initialized with existing file data');
    } catch (err) {
      console.error('Failed to initialize cache from file:', err);
      cacheData = [];
    }
  }
}

// 合并新数据到已有数据，确保不重复（基于 timestamp）
function mergeUniqueData(existingData, newData) {
  const existingTimestamps = new Set(existingData.map((item) => item.timestamp));
  const uniqueNewData = newData.filter((item) => !existingTimestamps.has(item.timestamp));
  return [...existingData, ...uniqueNewData].sort((a, b) => b.timestamp - a.timestamp);
}

// 主处理函数
async function updateData() {
  // 从网络获取数据
  const newData = await fetchHotlist();
  if (newData.length === 0) return;

  // 转换获取到的数据
  const transformedData = transformData(newData);

  // 合并数据
  cacheData = mergeUniqueData(cacheData, transformedData);

  // 异步写入到文件（降低 I/O 频率）
  writeLocalData(cacheData);
}

// 查询接口，根据 timestamp 返回大于 timestamp 的条目
app.get('/query', (req, res) => {
  const timestamp = parseInt(req.query.timestamp, 10);

  if (isNaN(timestamp)) {
    return res.status(400).json({ error: 'Invalid timestamp provided' });
  }

  // 直接从缓存中筛选出符合条件的条目
  const result = cacheData.filter((item) => item.timestamp > timestamp);

  return res.json(result);
});

// 启动服务
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// 初始化缓存数据
initializeCache();

// 定时更新数据（每 5 分钟一次）
setInterval(updateData, 30 * 1000);

// 立即执行一次
updateData();
