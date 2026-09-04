---
lang: zh
rev: 2
paths: "Wechatian|Wechatian/outbox|Wechatian/attachments"
---

# 微信发送(Wechatian)

本 vault 装了 Wechatian 插件,提供一条一对一微信通道:所有消息都发给 vault 主人自己绑定的微信。

## 发送

往发件箱目录 `Wechatian/outbox/` 写一个文件:

- `.md` 文件:内容**原样**作为文本消息发送,**支持 markdown 格式**(标题、列表、加粗、代码块),建议控制在手机一屏内(文件名无语义)
- 图片(`.jpg/.png/.gif/.webp`)、视频(`.mp4` 等)或文档(`.pdf/.docx/...`,≤100MB):作为附件发送

插件在下一轮轮询(约 30-60 秒)消费发件箱。发送成功会删除文件,并把这条消息记录进 `Wechatian/` 下当天的对话笔记(标记"发送";媒体发送会在 `Wechatian/attachments/` 存一份副本并在笔记里链接)。失败会保留文件(`.md` 末尾追加 `<!-- Wechatian send failed: ... -->` 注释,媒体文件生成 `<文件名>.wechatian-failed.md` 记录)。写入后等约一分钟,检查文件是否还在以判断结果。

## 接收

收到的微信消息追加到同一份每日对话笔记 `Wechatian/`(标记"接收"),媒体附件保存在 `Wechatian/attachments/`。

## 限制

网关对主动消息有限流。用于通知(任务完成、长任务结束),不要当聊天通道。
