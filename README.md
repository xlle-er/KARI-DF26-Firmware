# KARI DF26 Firmware

[统一使用文档](https://github.com/xlle-er/KARI-DF26) · [首次安装](https://github.com/xlle-er/KARI-DF26/blob/main/docs/installation.md) · [部署工具](https://github.com/xlle-er/KARI-DF26-Skill)

ESP32-S3 底盘固件：BLE / Wi-Fi 控制、热点配网、设备面板、持久化接线、方向校准和双分区 OTA。当前业务版本 **2.2.2**，首次 KARI 构建。支持 N16R8、N8R8；本次重新构建与契约检查已通过，USB、真实电机和 OTA 待实际设备验收。详见 [VERIFICATION.md](VERIFICATION.md)。

## 官方接线

| L298N | GPIO |
| --- | --- |
| 左 IN1 / IN2 / ENA | 16 / 15 / 17 |
| 右 IN3 / IN4 / ENB | 7 / 6 / 5 |

GPIO 为芯片编号，不是排针序号。ESP32 与 L298N 共地，拔掉 ENA / ENB 跳帽。首次配置前断开电机电源，未确认接线前固件不启用电机输出；驱动输入浮空时需硬件下拉或保持电机断电。

## 首次安装

推荐使用 [KARI 部署工具](https://github.com/xlle-er/KARI-DF26-Skill)。网页安装源码位于 [installer](installer)，公开安装入口将在配套发布后启用；本地运行：

```sh
python3 scripts/build.py
cd installer
npm ci
npm run dev
```

使用电脑 Chrome / Edge 打开显示的 localhost 地址，匹配板型后进行安装。构建过程本身不会烧录。N16R8 / N8R8 的分段 USB 清单分别为 `kari-s3-usb.json` / `kari-s3-n8r8-usb.json`；不要混用板型。

本次使用新的配置命名空间，需要重新配网、确认接线并校准。USB 安装不自动擦除整片 Flash，也不会读取历史品牌配置。

## 配网与管理

连接实际广播的 `KARI-…` 热点，打开 `http://192.168.4.1/`；接入路由器后，使用设备当前局域网 IP。设备 ID 为 `kari-<MAC>`，mDNS 为 `_kari._tcp`，BLE 名称为 `KARI Body`。

初始设备管理用户名为 `admin`，初始密码为 `12345678`，请按设备面板提供的功能修改。密码不是路由器密码。长按 BOOT 约三秒后松开可重新进入配置入口。

架空车轮，短时测试方向并保存左右交换 / 电机反向设置。保存、接管和升级会先停车；不会自动恢复旧动作。

## 固件开发（维护者）

固定工具链：Arduino ESP32 **3.3.12**、ArduinoJson **7.4.3**、NimBLE-Arduino **2.5.1**。安装 Arduino CLI 后：

```sh
./scripts/build.sh
python3 tests/contracts.py
cd installer
npm ci
npm test
npm run build
```

`build.sh` 默认构建两种板型，也可传 `--board n16r8` 或 `--board n8r8`。生成结果位于 `dist/`，包含应用包、USB 分段清单、哈希、源文件摘要和安装页数据。安装页静态产物位于 `installer/dist/`。

跨端集成验证时，将 Android、iOS、Web、Skill 仓库按项目名称放在同级目录，运行：

```sh
python3 tests/contracts.py --require-clients
```

严格模式在缺少必要客户端时失败，避免跳过跨仓库检查。单仓库模式只执行本地可用检查。硬件策略以 [hardware/boards.json](hardware/boards.json) 为源，运行 `scripts/sync-hardware.py --check` 验证生成文件。

## 更新与发布

[KARI Releases](https://github.com/xlle-er/KARI-DF26-Firmware/releases) 使用新仓库地址。OTA 包为 `kari-s3.bin` / `kari-s3-n8r8.bin`，配套 JSON 包含版本、板型、大小和 SHA-256。USB 使用分段清单，OTA 使用应用包，两者不能互换。

尚未通过真机验收的构建保留为发布草稿，不作为正式稳定版。没有稳定 Release 时，在线 `latest` 不可用；可从本地构建结果安装。安装站点与稳定发布待验收完成后启用。

相关客户端：[Web](https://github.com/xlle-er/KARI-DF26-WEB) · [Android](https://github.com/xlle-er/KARI-DF26-ANDROID) · [iOS](https://github.com/xlle-er/KARI-DF26-IOS)。
