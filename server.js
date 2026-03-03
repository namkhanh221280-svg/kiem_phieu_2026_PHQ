const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Cấu hình ứng cử viên (Phải khớp với file index.html máy trạm)
const CANDIDATES = ["Trung Hải", "Tâm Hiền", "Văn Hùng", "Hồng Linh", "Đức Tuấn", "Thế Uyên"];

// Biến lưu trữ tổng hợp dữ liệu toàn hệ thống
let systemData = {
    totalBallots: 0,
    validBallots: 0,
    invalidBallots: 0,
    votes: new Array(CANDIDATES.length).fill(0),
    groups: {} // Lưu tiến độ từng tổ
};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Một thiết bị đã kết nối:', socket.id);

    // Khi máy trạm đăng ký số tổ
    socket.on('register_group', (groupId) => {
        socket.groupId = groupId;
        if (!systemData.groups[groupId]) {
            systemData.groups[groupId] = 0;
        }
        // Gửi dữ liệu hiện tại cho thiết bị mới kết nối
        socket.emit('update_dashboard', systemData);
    });

    // Xử lý khi nhận được phiếu bầu từ tổ kiểm phiếu
    socket.on('submit_ballot', (payload) => {
        const { groupId, isValid, selectedIndexes } = payload;

        systemData.totalBallots++;
        systemData.groups[groupId]++;

        if (isValid) {
            systemData.validBallots++;
            // Cộng dồn phiếu cho từng ứng cử viên 
            selectedIndexes.forEach(idx => {
                if (systemData.votes[idx] !== undefined) {
                    systemData.votes[idx]++;
                }
            });
        } else {
            systemData.invalidBallots++;
        }

        // Phát tín hiệu cập nhật số liệu mới cho TẤT CẢ các máy (bao gồm máy Admin)
        io.emit('update_dashboard', systemData);
    });

    // Reset dữ liệu (Chỉ Admin mới có quyền này)
    socket.on('reset_all_data', () => {
        systemData = {
            totalBallots: 0,
            validBallots: 0,
            invalidBallots: 0,
            votes: new Array(CANDIDATES.length).fill(0),
            groups: {}
        };
        io.emit('update_dashboard', systemData);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});