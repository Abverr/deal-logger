const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const logFile = "./deal_log.json";

// 👉 ВСТАВЬ сюда свой входящий вебхук с правами CRM
const BITRIX_WEBHOOK = "https://dnk-labtest.bitrix24.ru/rest/1/8oqcsbsm6gzvb0vg/crm.deal.get.json/";

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/log_deal_event", async (req, res) => {
  console.log("Webhook received:", JSON.stringify(req.body, null, 2));
  const dealId = req.body?.data?.FIELDS?.ID;

  if (!dealId) {
    return res.status(400).json({ error: "Нет ID сделки" });
  }

  try {
    // 👉 Дёргаем Bitrix24 API, чтобы получить детали сделки
    const response = await axios.get(`${BITRIX_WEBHOOK}crm.deal.get`, {
      params: { id: dealId }
    });

    const deal = response.data.result;
    if (!deal) {
      return res.status(400).json({ error: "Сделка не найдена" });
    }

    const logEntry = {
      deal_id: dealId,
      stage: deal.STAGE_ID,
      title: deal.TITLE,
      modified_by: deal.ASSIGNED_BY_ID,
      date: deal.DATE_MODIFY
    };

    let logs = fs.existsSync(logFile)
      ? JSON.parse(fs.readFileSync(logFile))
      : {};
    if (!logs[dealId]) logs[dealId] = [];
    logs[dealId].push(logEntry);

    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    res.json({ status: "ok", logEntry });
  } catch (err) {
    console.error("Ошибка при запросе к Bitrix:", err.message);
    res.status(500).json({ error: "Ошибка при запросе к Bitrix" });
  }
});

app.get("/get_deal_log", (req, res) => {
  const logs = fs.existsSync(logFile)
    ? JSON.parse(fs.readFileSync(logFile))
    : {};
  res.json(logs);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
