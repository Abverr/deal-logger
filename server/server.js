const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const logFile = './deal_log.json';

// Вебхук Bitrix24: сохраняем каждое изменение сделки
app.post('/log_deal_event', (req, res) => {
  const data = req.body;

  if (!data || !data.FIELDS || !data.CHANGED_BY) return res.status(400).json({ error: 'Нет данных' });

  const dealId = data.FIELDS.ID;
  const stageFrom = data.FIELDS.STAGE_ID_OLD || null; // старый этап (Bitrix24 присылает)
  const stageTo = data.FIELDS.STAGE_ID || null;       // новый этап
  const userId = data.CHANGED_BY.ID;
  const userName = `${data.CHANGED_BY.NAME} ${data.CHANGED_BY.LAST_NAME}`;
  const dateTime = data.FIELDS.TIMESTAMP_X || new Date().toISOString();

  let logs = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile)) : {};
  if (!logs[dealId]) logs[dealId] = [];

  logs[dealId].push({
    stage_from: stageFrom,
    stage_to: stageTo,
    user_id: userId,
    user_name: userName,
    date_time: dateTime
  });

  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  res.json({ status: 'ok' });
});

// Ручка для HR: отдаёт полный лог
app.get('/get_deal_log', (req, res) => {
  const logs = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile)) : {};
  res.json(logs);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
