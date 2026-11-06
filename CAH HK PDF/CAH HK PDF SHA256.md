## SHA-256 Checksums / SHA-256 校驗值

SHA-256 checksums help readers detect changes to PDF files. A matching checksum alone does not prove a file's source or authenticity.

SHA-256 校驗值可協助讀者檢查 PDF 文件有否被修改。不過，校驗值一致本身不能證明文件的來源或真實性。

- **Factual Summary Crimes Against Humanity HK.pdf**  
  `57394c43ee17bcbfb6371366a042b957555eb944e55dbdb10a5be0e138c34530`
- **Individual Liability Crimes Against Humanity HK.pdf**  
  `94c7a78a4665e7c98fe4237a67e51d73582ec108d9fae7d6b9f8607f01e7a0b8`
- **Evidence Bundle Crimes Against Humanity HK.pdf**  
  `6cb08cfc22ae87e935f2b66a7915259a7006a9aa1c4c9cbacde48764e50f10de`
- **Translated Materials Crimes Against Humanity HK.pdf**  
  `1c90eadd89be816dc7d60a7414b8481d17de8cf35a76d7c4e76b5367baed3fff`

To verify file integrity, download the PDF and calculate its SHA-256 checksum using one of the commands below. Compare the result with the checksum listed above. A matching checksum indicates that the file's contents match the published hash.

如要驗證文件的完整性，請下載 PDF，並使用以下其中一條指令計算 SHA-256 校驗值。然後將結果與上列校驗值比較。如果一致，代表文件內容與公布的校驗值相符。

**macOS (Terminal)**

```bash
shasum -a 256 "Factual Summary Crimes Against Humanity HK.pdf"
```

**Linux (Terminal)**

```bash
sha256sum "Factual Summary Crimes Against Humanity HK.pdf"
```

**Windows (Command Prompt / CMD)**

```cmd
certutil -hashfile "Factual Summary Crimes Against Humanity HK.pdf" SHA256
```
