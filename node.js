const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 本地存储文件路径
const FILE_PATH = path.join(__dirname, './data.json');

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

// 读取本地数据文件
function readLocalData() {
  if (fs.existsSync(FILE_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Failed to read local data:', err);
      return [];
    }
  }
  return [];
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

// 主处理函数
async function updateData() {
  // 从网络获取数据
  const newData = await fetchHotlist();
  if (newData.length === 0) return;

  // 转换获取到的数据
  const transformedData = transformData(newData);

  // 读取本地已有数据
  const localData = readLocalData();

  // 合并数据，只添加新的记录（根据 timestamp 是否已存在）
  const updatedData = mergeUniqueData(localData, transformedData);

  // 写入本地存储
  writeLocalData(updatedData);
}

// 合并新数据到已有数据，确保不重复
function mergeUniqueData(existingData, newData) {
  const existingTimestamps = new Set(existingData.map((item) => item.timestamp));
  const uniqueNewData = newData.filter((item) => !existingTimestamps.has(item.timestamp));
  return [...existingData, ...uniqueNewData];
}

// 每隔 5 分钟执行一次更新
setInterval(updateData,  30 * 1000); // 5分钟

// 立即执行一次
updateData();
