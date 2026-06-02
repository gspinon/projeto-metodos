"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const clientDir = path_1.default.join(process.cwd(), 'dist', 'client');
app.use(express_1.default.static(clientDir));
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(clientDir, 'index.html'));
});
app.listen(PORT, () => {
    console.log(`Slot Machine running at http://localhost:${PORT}`);
});
