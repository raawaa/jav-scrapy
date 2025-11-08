"use strict";
/**
 * @file errorHandler.ts
 * @description 统一错误处理模块
 * @module utils/errorHandler
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
exports.retryWithBackoff = retryWithBackoff;
const logger_1 = __importDefault(require("../core/logger"));
/**
 * 统一错误处理函数
 */
class ErrorHandler {
    /**
     * 处理网络请求错误
     * @param error 错误对象
     * @param context 错误上下文信息
     */
    static handleNetworkError(error, context = '') {
        if (error instanceof Error) {
            logger_1.default.error(`网络请求错误 ${context ? `[${context}]` : ''}: ${error.message}`);
            logger_1.default.error(`错误类型: ${error.constructor.name}`);
            logger_1.default.error(`错误堆栈: ${error.stack || '无堆栈信息'}`);
            // 记录完整的错误对象
            logger_1.default.debug(`handleNetworkError: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 根据错误类型提供更具体的处理
            if (error.name === 'AxiosError') {
                const axiosError = error;
                const statusCode = axiosError.response?.status;
                const requestUrl = axiosError.config?.url;
                logger_1.default.error(`响应状态码: ${statusCode || 'N/A'}`);
                logger_1.default.error(`请求URL: ${requestUrl || 'N/A'}`);
                // 记录更详细的错误信息
                logger_1.default.debug(`handleNetworkError: Axios错误代码: ${axiosError.code || 'N/A'}`);
                logger_1.default.debug(`handleNetworkError: 请求方法: ${axiosError.config?.method || 'N/A'}`);
                logger_1.default.debug(`handleNetworkError: 请求超时: ${axiosError.config?.timeout || 'N/A'}`);
                // 记录完整的响应内容（如果有）
                if (axiosError.response) {
                    logger_1.default.error(`完整响应数据: ${JSON.stringify(axiosError.response.data, null, 2)}`);
                    logger_1.default.debug(`handleNetworkError: 响应状态文本: ${axiosError.response.statusText || 'N/A'}`);
                    logger_1.default.debug(`handleNetworkError: 响应头: ${JSON.stringify(axiosError.response.headers || {}, null, 2)}`);
                }
                // 记录请求配置信息（用于调试）
                if (axiosError.config) {
                    logger_1.default.debug(`请求方法: ${axiosError.config.method || 'N/A'}`);
                    logger_1.default.debug(`请求头: ${JSON.stringify(axiosError.config.headers || {}, null, 2)}`);
                    if (axiosError.config.data) {
                        logger_1.default.debug(`请求体: ${JSON.stringify(axiosError.config.data, null, 2)}`);
                    }
                    if (axiosError.config.params) {
                        logger_1.default.debug(`请求参数: ${JSON.stringify(axiosError.config.params, null, 2)}`);
                    }
                }
                // 记录网络相关信息
                try {
                    logger_1.default.debug(`handleNetworkError: 当前时间: ${new Date().toISOString()}`);
                    logger_1.default.debug(`handleNetworkError: 用户代理: ${axiosError.config?.headers?.['User-Agent'] || 'N/A'}`);
                    logger_1.default.debug(`handleNetworkError: 代理设置: ${axiosError.config?.proxy || 'N/A'}`);
                }
                catch (debugError) {
                    logger_1.default.debug(`handleNetworkError: 记录调试信息失败: ${debugError instanceof Error ? debugError.message : String(debugError)}`);
                }
                // 针对特定错误代码提供建议
                if (statusCode === 403) {
                    logger_1.default.warn('403 Forbidden: 可能是反爬虫机制，建议：');
                    logger_1.default.warn('  1. 检查代理设置是否正确');
                    logger_1.default.warn('  2. 尝试更新防屏蔽地址 (jav update)');
                    logger_1.default.warn('  3. 增加请求延迟时间 (-d 参数)');
                }
                else if (statusCode === 429) {
                    logger_1.default.warn('429 Too Many Requests: 请求过于频繁，建议：');
                    logger_1.default.warn('  1. 增加请求延迟时间 (-d 参数)');
                    logger_1.default.warn('  2. 降低并发数 (-p 参数)');
                }
                else if (statusCode === 401 || statusCode === 403) {
                    logger_1.default.warn(`${statusCode}: 认证失败，建议：`);
                    logger_1.default.warn('  1. 检查Cookie是否有效');
                    logger_1.default.warn('  2. 尝试手动设置Cookies (-c 参数)');
                }
                else if (!statusCode) {
                    logger_1.default.warn('无响应状态码，可能是网络连接问题：');
                    logger_1.default.warn('  1. 检查网络连接');
                    logger_1.default.warn('  2. 验证代理设置');
                    logger_1.default.warn('  3. 检查防火墙设置');
                }
                // 如果是AJAX请求，提供额外信息
                if (requestUrl && requestUrl.includes('/ajax/')) {
                    logger_1.default.warn('AJAX请求失败，这可能是因为：');
                    logger_1.default.warn('  1. 会话Cookie过期或无效');
                    logger_1.default.warn('  2. 网站检测到自动化行为');
                    logger_1.default.warn('  3. 请求头信息不正确');
                    logger_1.default.debug('建议尝试：');
                    logger_1.default.debug('  1. 手动访问网站更新会话');
                    logger_1.default.debug('  2. 使用不同的代理服务器');
                    logger_1.default.debug('  3. 暂停一段时间后重试');
                }
                // 记录响应头信息（如果有）
                if (axiosError.response?.headers) {
                    logger_1.default.debug(`响应头: ${JSON.stringify(axiosError.response.headers, null, 2)}`);
                }
            }
            else {
                // 处理其他类型的网络错误
                const errorCode = error.code;
                if (errorCode) {
                    switch (errorCode) {
                        case 'ECONNRESET':
                            logger_1.default.error('连接被重置，可能是服务器或代理问题');
                            logger_1.default.debug('建议：更换代理服务器或稍后重试');
                            break;
                        case 'ETIMEDOUT':
                            logger_1.default.error('连接超时，可能是网络慢或服务器响应慢');
                            logger_1.default.debug('建议：增加超时时间 (-t 参数) 或检查网络');
                            break;
                        case 'ENOTFOUND':
                            logger_1.default.error('域名解析失败，可能是网络连接或DNS问题');
                            logger_1.default.debug('建议：检查网络连接和DNS设置');
                            break;
                        case 'ECONNREFUSED':
                            logger_1.default.error('连接被拒绝，可能是代理设置问题');
                            logger_1.default.debug('建议：检查代理服务器地址和端口');
                            break;
                        default:
                            logger_1.default.error(`网络错误代码: ${errorCode}`);
                    }
                }
            }
        }
        else {
            logger_1.default.error(`未知网络错误 ${context ? `[${context}]` : ''}: ${JSON.stringify(error)}`);
            logger_1.default.debug(`handleNetworkError: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
        }
    }
    /**
     * 处理文件操作错误
     * @param error 错误对象
     * @param filePath 文件路径
     * @param operation 操作类型
     */
    static handleFileError(error, filePath, operation = '文件操作') {
        if (error instanceof Error) {
            logger_1.default.error(`${operation}错误: ${error.message}`);
            logger_1.default.error(`文件路径: ${filePath}`);
            logger_1.default.error(`错误类型: ${error.constructor.name}`);
            logger_1.default.error(`错误堆栈: ${error.stack || '无堆栈信息'}`);
            // 记录完整的错误对象
            logger_1.default.debug(`handleFileError: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 记录文件系统相关信息
            try {
                const fs = require('fs');
                const path = require('path');
                // 检查文件是否存在
                const fileExists = fs.existsSync(filePath);
                logger_1.default.debug(`handleFileError: 文件是否存在: ${fileExists}`);
                // 如果文件存在，获取文件信息
                if (fileExists) {
                    try {
                        const stats = fs.statSync(filePath);
                        logger_1.default.debug(`handleFileError: 文件大小: ${stats.size} 字节`);
                        logger_1.default.debug(`handleFileError: 文件创建时间: ${stats.birthtime.toISOString()}`);
                        logger_1.default.debug(`handleFileError: 文件修改时间: ${stats.mtime.toISOString()}`);
                        logger_1.default.debug(`handleFileError: 文件访问时间: ${stats.atime.toISOString()}`);
                        logger_1.default.debug(`handleFileError: 文件权限: ${stats.mode.toString(8)}`);
                    }
                    catch (statError) {
                        logger_1.default.debug(`handleFileError: 获取文件状态失败: ${statError instanceof Error ? statError.message : String(statError)}`);
                    }
                }
                // 检查目录是否存在
                const dirPath = path.dirname(filePath);
                const dirExists = fs.existsSync(dirPath);
                logger_1.default.debug(`handleFileError: 目录是否存在: ${dirExists}`);
                logger_1.default.debug(`handleFileError: 目录路径: ${dirPath}`);
                // 如果目录存在，获取目录信息
                if (dirExists) {
                    try {
                        const dirStats = fs.statSync(dirPath);
                        logger_1.default.debug(`handleFileError: 目录权限: ${dirStats.mode.toString(8)}`);
                        // 检查目录是否可写
                        fs.accessSync(dirPath, fs.constants.W_OK);
                        logger_1.default.debug(`handleFileError: 目录可写: 是`);
                    }
                    catch (accessError) {
                        logger_1.default.debug(`handleFileError: 目录可写: 否`);
                        logger_1.default.debug(`handleFileError: 目录访问错误: ${accessError instanceof Error ? accessError.message : String(accessError)}`);
                    }
                }
                // 记录当前工作目录
                logger_1.default.debug(`handleFileError: 当前工作目录: ${process.cwd()}`);
                // 记录系统信息
                logger_1.default.debug(`handleFileError: 操作系统: ${process.platform}`);
                logger_1.default.debug(`handleFileError: Node.js版本: ${process.version}`);
                logger_1.default.debug(`handleFileError: 当前用户: ${process.env.USER || process.env.USERNAME || 'N/A'}`);
            }
            catch (fsError) {
                logger_1.default.debug(`handleFileError: 获取文件系统信息失败: ${fsError instanceof Error ? fsError.message : String(fsError)}`);
            }
            // 根据错误代码提供具体处理建议
            const errorCode = error.code;
            if (errorCode) {
                logger_1.default.debug(`handleFileError: 错误代码: ${errorCode}`);
                switch (errorCode) {
                    case 'ENOENT':
                        logger_1.default.error(`文件或目录不存在: ${filePath}`);
                        logger_1.default.debug('建议：');
                        logger_1.default.debug('  1. 检查文件路径是否正确');
                        logger_1.default.debug('  2. 确保文件已正确创建');
                        logger_1.default.debug('  3. 检查是否有权限访问该目录');
                        break;
                    case 'EACCES':
                    case 'EPERM':
                        logger_1.default.error(`权限不足: ${filePath}`);
                        logger_1.default.debug('建议：');
                        logger_1.default.debug('  1. 检查文件/目录权限设置');
                        logger_1.default.debug('  2. 尝试以管理员权限运行');
                        logger_1.default.debug('  3. 更改文件/目录所有者');
                        break;
                    case 'EISDIR':
                        logger_1.default.error(`路径指向目录而非文件: ${filePath}`);
                        logger_1.default.debug('建议：');
                        logger_1.default.debug('  1. 检查路径是否正确');
                        logger_1.default.debug('  2. 确保操作对象是文件而非目录');
                        break;
                    case 'ENOTDIR':
                        logger_1.default.error(`路径的一部分不是目录: ${filePath}`);
                        logger_1.default.debug('建议：');
                        logger_1.default.debug('  1. 检查路径中的所有目录是否存在');
                        logger_1.default.debug('  2. 确保路径格式正确');
                        break;
                    case 'ENOSPC':
                        logger_1.default.error(`磁盘空间不足: ${filePath}`);
                        logger_1.default.debug('建议：');
                        logger_1.default.debug('  1. 清理磁盘空间');
                        logger_1.default.debug('  2. 移动文件到其他磁盘');
                        logger_1.default.debug('  3. 检查磁盘配额限制');
                        break;
                    case 'EROFS':
                        logger_1.default.error(`文件系统为只读: ${filePath}`);
                        logger_1.default.debug('建议：');
                        logger_1.default.debug('  1. 检查文件系统挂载选项');
                        logger_1.default.debug('  2. 尝试写入其他位置');
                        logger_1.default.debug('  3. 联系系统管理员');
                        break;
                    case 'EBUSY':
                        logger_1.default.error(`资源被占用: ${filePath}`);
                        logger_1.default.debug('建议：');
                        logger_1.default.debug('  1. 检查文件是否被其他程序占用');
                        logger_1.default.debug('  2. 等待一段时间后重试');
                        logger_1.default.debug('  3. 重启相关程序');
                        break;
                    case 'EMFILE':
                    case 'ENFILE':
                        logger_1.default.error(`系统打开文件数量达到上限: ${filePath}`);
                        logger_1.default.debug('建议：');
                        logger_1.default.debug('  1. 关闭不需要的文件句柄');
                        logger_1.default.debug('  2. 增加系统文件句柄限制');
                        logger_1.default.debug('  3. 重启程序释放资源');
                        break;
                    default:
                        logger_1.default.error(`未知文件系统错误: ${errorCode}`);
                }
            }
        }
        else {
            logger_1.default.error(`未知${operation}错误: ${JSON.stringify(error)}`);
            logger_1.default.debug(`handleFileError: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
        }
    }
    /**
     * 处理解析错误
     * @param error 错误对象
     * @param data 尝试解析的数据
     * @param context 错误上下文信息
     */
    static handleParseError(error, data, context = '') {
        if (error instanceof Error) {
            logger_1.default.error(`数据解析错误 ${context ? `[${context}]` : ''}: ${error.message}`);
            logger_1.default.error(`错误类型: ${error.constructor.name}`);
            logger_1.default.error(`错误堆栈: ${error.stack || '无堆栈信息'}`);
            // 记录完整的错误对象
            logger_1.default.debug(`handleParseError: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 记录数据相关信息
            logger_1.default.debug(`handleParseError: 数据长度: ${data.length} 字符`);
            logger_1.default.debug(`handleParseError: 数据类型: ${typeof data}`);
            // 记录数据的前500个字符（用于调试）
            if (data.length > 0) {
                const preview = data.length > 500 ? data.substring(0, 500) + '...' : data;
                logger_1.default.debug(`handleParseError: 数据预览: ${preview}`);
            }
            else {
                logger_1.default.debug(`handleParseError: 数据为空`);
            }
            // 尝试检测数据格式
            try {
                const trimmedData = data.trim();
                // 检查是否是JSON格式
                if (trimmedData.startsWith('{') || trimmedData.startsWith('[')) {
                    logger_1.default.debug(`handleParseError: 数据可能是JSON格式`);
                    // 尝试找到JSON语法错误的位置
                    try {
                        JSON.parse(trimmedData);
                    }
                    catch (jsonError) {
                        if (jsonError instanceof Error) {
                            const match = jsonError.message.match(/position (\d+)/);
                            if (match) {
                                const position = parseInt(match[1]);
                                logger_1.default.debug(`handleParseError: JSON语法错误位置: ${position}`);
                                // 显示错误位置周围的内容
                                const start = Math.max(0, position - 50);
                                const end = Math.min(trimmedData.length, position + 50);
                                const context = trimmedData.substring(start, end);
                                logger_1.default.debug(`handleParseError: 错误位置上下文: ${context}`);
                            }
                        }
                    }
                }
                // 检查是否是HTML格式
                if (trimmedData.startsWith('<')) {
                    logger_1.default.debug(`handleParseError: 数据可能是HTML格式`);
                    // 尝试检测HTML结构
                    const htmlTags = trimmedData.match(/<[^>]+>/g);
                    if (htmlTags) {
                        logger_1.default.debug(`handleParseError: 检测到 ${htmlTags.length} 个HTML标签`);
                        // 检查是否有常见的HTML标签
                        const commonTags = ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'script', 'style'];
                        const foundTags = htmlTags.filter(tag => commonTags.some(commonTag => tag.toLowerCase().includes(commonTag)));
                        if (foundTags.length > 0) {
                            logger_1.default.debug(`handleParseError: 检测到常见HTML标签: ${foundTags.slice(0, 5).join(', ')}`);
                        }
                    }
                }
                // 检查是否是XML格式
                if (trimmedData.startsWith('<?xml') || (trimmedData.includes('<') && trimmedData.includes('</'))) {
                    logger_1.default.debug(`handleParseError: 数据可能是XML格式`);
                }
                // 检查是否包含特殊字符
                const specialChars = trimmedData.match(/[^\x00-\x7F]/g);
                if (specialChars) {
                    logger_1.default.debug(`handleParseError: 检测到 ${specialChars.length} 个非ASCII字符`);
                }
                // 检查编码问题
                try {
                    const buffer = Buffer.from(data, 'utf8');
                    const isUtf8 = buffer.toString('utf8') === data;
                    logger_1.default.debug(`handleParseError: UTF-8编码检查: ${isUtf8 ? '通过' : '失败'}`);
                }
                catch (encodingError) {
                    logger_1.default.debug(`handleParseError: 编码检查失败: ${encodingError instanceof Error ? encodingError.message : String(encodingError)}`);
                }
            }
            catch (analysisError) {
                logger_1.default.debug(`handleParseError: 数据分析失败: ${analysisError instanceof Error ? analysisError.message : String(analysisError)}`);
            }
            // 记录系统环境信息
            try {
                logger_1.default.debug(`handleParseError: 当前时间: ${new Date().toISOString()}`);
                logger_1.default.debug(`handleParseError: Node.js版本: ${process.version}`);
                logger_1.default.debug(`handleParseError: 操作系统: ${process.platform}`);
            }
            catch (envError) {
                logger_1.default.debug(`handleParseError: 记录环境信息失败: ${envError instanceof Error ? envError.message : String(envError)}`);
            }
            // 提供解析错误的通用建议
            logger_1.default.debug('解析错误可能的原因：');
            logger_1.default.debug('  1. 数据格式不正确');
            logger_1.default.debug('  2. 数据损坏或不完整');
            logger_1.default.debug('  3. 编码问题');
            logger_1.default.debug('  4. 服务器返回了错误页面');
            logger_1.default.debug('  5. 网络传输过程中数据被截断');
            logger_1.default.debug('建议的解决方案：');
            logger_1.default.debug('  1. 检查数据来源是否可靠');
            logger_1.default.debug('  2. 验证数据格式是否符合预期');
            logger_1.default.debug('  3. 尝试使用不同的解析方法');
            logger_1.default.debug('  4. 检查网络连接和请求设置');
            logger_1.default.debug('  5. 添加数据验证和错误恢复机制');
        }
        else {
            logger_1.default.error(`未知解析错误 ${context ? `[${context}]` : ''}: ${JSON.stringify(error)}`);
            logger_1.default.debug(`handleParseError: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            logger_1.default.debug(`handleParseError: 数据长度: ${data.length} 字符`);
            if (data.length > 0) {
                const preview = data.length > 500 ? data.substring(0, 500) + '...' : data;
                logger_1.default.debug(`handleParseError: 数据预览: ${preview}`);
            }
        }
    }
    /**
     * 处理通用错误
     * @param error 错误对象
     * @param context 错误上下文信息
     */
    static handleGenericError(error, context = '') {
        if (error instanceof Error) {
            logger_1.default.error(`通用错误 ${context ? `[${context}]` : ''}: ${error.message}`);
            logger_1.default.error(`错误类型: ${error.constructor.name}`);
            logger_1.default.error(`错误堆栈: ${error.stack || '无堆栈信息'}`);
            // 记录完整的错误对象
            logger_1.default.debug(`handleGenericError: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 记录错误对象的属性
            try {
                const errorProps = Object.getOwnPropertyNames(error);
                if (errorProps.length > 0) {
                    logger_1.default.debug(`handleGenericError: 错误对象属性: ${errorProps.join(', ')}`);
                    // 记录每个属性的值
                    errorProps.forEach(prop => {
                        try {
                            const value = error[prop];
                            if (typeof value === 'object') {
                                logger_1.default.debug(`handleGenericError: ${prop}: ${JSON.stringify(value)}`);
                            }
                            else {
                                logger_1.default.debug(`handleGenericError: ${prop}: ${value}`);
                            }
                        }
                        catch (propError) {
                            logger_1.default.debug(`handleGenericError: 无法获取属性 ${prop} 的值: ${propError instanceof Error ? propError.message : String(propError)}`);
                        }
                    });
                }
            }
            catch (propsError) {
                logger_1.default.debug(`handleGenericError: 获取错误对象属性失败: ${propsError instanceof Error ? propsError.message : String(propsError)}`);
            }
            // 记录系统环境信息
            try {
                logger_1.default.debug(`handleGenericError: 当前时间: ${new Date().toISOString()}`);
                logger_1.default.debug(`handleGenericError: Node.js版本: ${process.version}`);
                logger_1.default.debug(`handleGenericError: 操作系统: ${process.platform}`);
                logger_1.default.debug(`handleGenericError: 架构: ${process.arch}`);
                logger_1.default.debug(`handleGenericError: 当前工作目录: ${process.cwd()}`);
                logger_1.default.debug(`handleGenericError: 内存使用: ${JSON.stringify(process.memoryUsage())}`);
                logger_1.default.debug(`handleGenericError: CPU使用: ${process.cpuUsage()}`);
                // 记录环境变量（部分）
                const envVars = ['PATH', 'HOME', 'USER', 'USERNAME', 'NODE_ENV', 'DEBUG'];
                const relevantEnv = {};
                envVars.forEach(varName => {
                    if (process.env[varName]) {
                        relevantEnv[varName] = process.env[varName];
                    }
                });
                if (Object.keys(relevantEnv).length > 0) {
                    logger_1.default.debug(`handleGenericError: 相关环境变量: ${JSON.stringify(relevantEnv)}`);
                }
            }
            catch (envError) {
                logger_1.default.debug(`handleGenericError: 记录环境信息失败: ${envError instanceof Error ? envError.message : String(envError)}`);
            }
            // 尝试根据错误名称提供更具体的处理建议
            const errorName = error.name;
            logger_1.default.debug(`handleGenericError: 错误名称: ${errorName}`);
            switch (errorName) {
                case 'TypeError':
                    logger_1.default.debug('TypeError 可能的原因：');
                    logger_1.default.debug('  1. 尝试对null或undefined执行操作');
                    logger_1.default.debug('  2. 类型不匹配');
                    logger_1.default.debug('  3. 对象属性不存在');
                    logger_1.default.debug('建议：添加null/undefined检查和类型验证');
                    break;
                case 'ReferenceError':
                    logger_1.default.debug('ReferenceError 可能的原因：');
                    logger_1.default.debug('  1. 引用了未声明的变量');
                    logger_1.default.debug('  2. 变量作用域问题');
                    logger_1.default.debug('建议：检查变量声明和作用域');
                    break;
                case 'RangeError':
                    logger_1.default.debug('RangeError 可能的原因：');
                    logger_1.default.debug('  1. 数值超出有效范围');
                    logger_1.default.debug('  2. 数组长度无效');
                    logger_1.default.debug('  3. 递归调用过深');
                    logger_1.default.debug('建议：检查数值范围和递归深度');
                    break;
                case 'SyntaxError':
                    logger_1.default.debug('SyntaxError 可能的原因：');
                    logger_1.default.debug('  1. 代码语法错误');
                    logger_1.default.debug('  2. JSON格式错误');
                    logger_1.default.debug('建议：检查代码语法和JSON格式');
                    break;
                case 'EvalError':
                    logger_1.default.debug('EvalError 可能的原因：');
                    logger_1.default.debug('  1. eval()函数执行失败');
                    logger_1.default.debug('建议：检查eval()中的代码');
                    break;
                case 'URIError':
                    logger_1.default.debug('URIError 可能的原因：');
                    logger_1.default.debug('  1. URI编码/解码错误');
                    logger_1.default.debug('建议：检查URI格式');
                    break;
                default:
                    logger_1.default.debug(`未知错误类型: ${errorName}`);
                    logger_1.default.debug('建议：检查错误消息和堆栈跟踪以确定问题原因');
            }
            // 记录调用栈信息
            try {
                const stack = error.stack;
                if (stack) {
                    const stackLines = stack.split('\n');
                    logger_1.default.debug(`handleGenericError: 调用栈深度: ${stackLines.length}`);
                    // 记录前5行调用栈（最相关的部分）
                    if (stackLines.length > 1) {
                        logger_1.default.debug('handleGenericError: 主要调用栈:');
                        stackLines.slice(1, 6).forEach((line, index) => {
                            logger_1.default.debug(`  ${index + 1}. ${line.trim()}`);
                        });
                    }
                }
            }
            catch (stackError) {
                logger_1.default.debug(`handleGenericError: 分析调用栈失败: ${stackError instanceof Error ? stackError.message : String(stackError)}`);
            }
            // 提供通用错误处理建议
            logger_1.default.debug('通用错误处理建议：');
            logger_1.default.debug('  1. 检查错误消息和堆栈跟踪');
            logger_1.default.debug('  2. 验证输入参数和类型');
            logger_1.default.debug('  3. 确保资源正确初始化');
            logger_1.default.debug('  4. 添加适当的错误处理和恢复机制');
            logger_1.default.debug('  5. 检查系统环境和依赖项');
        }
        else {
            logger_1.default.error(`未知通用错误 ${context ? `[${context}]` : ''}: ${JSON.stringify(error)}`);
            logger_1.default.debug(`handleGenericError: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 尝试确定错误类型
            logger_1.default.debug(`handleGenericError: 错误类型: ${typeof error}`);
            if (error === null) {
                logger_1.default.debug('handleGenericError: 错误为null');
            }
            else if (error === undefined) {
                logger_1.default.debug('handleGenericError: 错误为undefined');
            }
            else if (typeof error === 'object') {
                try {
                    const errorProps = Object.getOwnPropertyNames(error);
                    logger_1.default.debug(`handleGenericError: 错误对象属性: ${errorProps.join(', ')}`);
                    // 记录每个属性的值
                    errorProps.forEach(prop => {
                        try {
                            const value = error[prop];
                            if (typeof value === 'object') {
                                logger_1.default.debug(`handleGenericError: ${prop}: ${JSON.stringify(value)}`);
                            }
                            else {
                                logger_1.default.debug(`handleGenericError: ${prop}: ${value}`);
                            }
                        }
                        catch (propError) {
                            logger_1.default.debug(`handleGenericError: 无法获取属性 ${prop} 的值: ${propError instanceof Error ? propError.message : String(propError)}`);
                        }
                    });
                }
                catch (propsError) {
                    logger_1.default.debug(`handleGenericError: 分析错误对象失败: ${propsError instanceof Error ? propsError.message : String(propsError)}`);
                }
            }
        }
    }
}
exports.ErrorHandler = ErrorHandler;
/**
 * 带退避策略的重试函数
 * @param fn 要重试的函数
 * @param maxRetries 最大重试次数
 * @param initialDelay 初始延迟时间（毫秒）
 * @param backoffFactor 退避因子
 * @param context 重试上下文信息
 * @returns 函数执行结果
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000, backoffFactor = 2, context = '') {
    let lastError;
    let attempt = 0;
    logger_1.default.debug(`retryWithBackoff: 开始重试操作 ${context ? `[${context}]` : ''}`);
    logger_1.default.debug(`retryWithBackoff: 最大重试次数: ${maxRetries}`);
    logger_1.default.debug(`retryWithBackoff: 初始延迟: ${initialDelay}ms`);
    logger_1.default.debug(`retryWithBackoff: 退避因子: ${backoffFactor}`);
    // 记录系统环境信息
    try {
        logger_1.default.debug(`retryWithBackoff: 当前时间: ${new Date().toISOString()}`);
        logger_1.default.debug(`retryWithBackoff: Node.js版本: ${process.version}`);
        logger_1.default.debug(`retryWithBackoff: 操作系统: ${process.platform}`);
        logger_1.default.debug(`retryWithBackoff: 内存使用: ${JSON.stringify(process.memoryUsage())}`);
    }
    catch (envError) {
        logger_1.default.debug(`retryWithBackoff: 记录环境信息失败: ${envError instanceof Error ? envError.message : String(envError)}`);
    }
    while (attempt <= maxRetries) {
        attempt++;
        logger_1.default.debug(`retryWithBackoff: 尝试第 ${attempt} 次 ${context ? `[${context}]` : ''}`);
        try {
            const startTime = Date.now();
            const result = await fn();
            const duration = Date.now() - startTime;
            logger_1.default.debug(`retryWithBackoff: 第 ${attempt} 次尝试成功 ${context ? `[${context}]` : ''}`);
            logger_1.default.debug(`retryWithBackoff: 执行时间: ${duration}ms`);
            if (attempt > 1) {
                logger_1.default.info(`操作成功 ${context ? `[${context}]` : ''}，共尝试 ${attempt} 次`);
            }
            return result;
        }
        catch (error) {
            lastError = error;
            const errorTime = new Date().toISOString();
            logger_1.default.debug(`retryWithBackoff: 第 ${attempt} 次尝试失败 ${context ? `[${context}]` : ''} (${errorTime})`);
            // 记录详细的错误信息
            if (error instanceof Error) {
                logger_1.default.debug(`retryWithBackoff: 错误消息: ${error.message}`);
                logger_1.default.debug(`retryWithBackoff: 错误类型: ${error.constructor.name}`);
                logger_1.default.debug(`retryWithBackoff: 错误堆栈: ${error.stack || '无堆栈信息'}`);
                // 记录完整的错误对象
                logger_1.default.debug(`retryWithBackoff: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
                // 记录错误对象的属性
                try {
                    const errorProps = Object.getOwnPropertyNames(error);
                    if (errorProps.length > 0) {
                        logger_1.default.debug(`retryWithBackoff: 错误对象属性: ${errorProps.join(', ')}`);
                        // 记录每个属性的值
                        errorProps.forEach(prop => {
                            try {
                                const value = error[prop];
                                if (typeof value === 'object') {
                                    logger_1.default.debug(`retryWithBackoff: ${prop}: ${JSON.stringify(value)}`);
                                }
                                else {
                                    logger_1.default.debug(`retryWithBackoff: ${prop}: ${value}`);
                                }
                            }
                            catch (propError) {
                                logger_1.default.debug(`retryWithBackoff: 无法获取属性 ${prop} 的值: ${propError instanceof Error ? propError.message : String(propError)}`);
                            }
                        });
                    }
                }
                catch (propsError) {
                    logger_1.default.debug(`retryWithBackoff: 获取错误对象属性失败: ${propsError instanceof Error ? propsError.message : String(propsError)}`);
                }
                // 根据错误类型提供特定信息
                if (error.name === 'AxiosError') {
                    const axiosError = error;
                    const statusCode = axiosError.response?.status;
                    const requestUrl = axiosError.config?.url;
                    logger_1.default.debug(`retryWithBackoff: Axios错误 - 状态码: ${statusCode || 'N/A'}, URL: ${requestUrl || 'N/A'}`);
                    // 对于某些HTTP状态码，重试可能没有意义
                    if (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404) {
                        logger_1.default.debug(`retryWithBackoff: HTTP ${statusCode} 错误，重试可能无效`);
                    }
                }
            }
            else {
                logger_1.default.debug(`retryWithBackoff: 非Error对象错误: ${JSON.stringify(error)}`);
                logger_1.default.debug(`retryWithBackoff: 错误类型: ${typeof error}`);
            }
            // 如果是最后一次尝试，不需要延迟
            if (attempt > maxRetries) {
                logger_1.default.debug(`retryWithBackoff: 已达到最大重试次数 ${maxRetries}，停止重试`);
                break;
            }
            // 计算延迟时间（指数退避）
            const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
            logger_1.default.debug(`retryWithBackoff: 等待 ${delay}ms 后进行下一次重试`);
            // 记录延迟开始时间
            const delayStartTime = Date.now();
            try {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            catch (delayError) {
                logger_1.default.debug(`retryWithBackoff: 延迟过程中出错: ${delayError instanceof Error ? delayError.message : String(delayError)}`);
                // 即使延迟出错，也继续尝试
            }
            // 记录实际延迟时间
            const actualDelay = Date.now() - delayStartTime;
            logger_1.default.debug(`retryWithBackoff: 实际延迟时间: ${actualDelay}ms`);
            // 记录系统状态变化
            try {
                const memUsage = process.memoryUsage();
                logger_1.default.debug(`retryWithBackoff: 内存使用变化: ${JSON.stringify(memUsage)}`);
            }
            catch (memError) {
                logger_1.default.debug(`retryWithBackoff: 获取内存使用信息失败: ${memError instanceof Error ? memError.message : String(memError)}`);
            }
        }
    }
    // 所有重试都失败了
    logger_1.default.error(`操作失败 ${context ? `[${context}]` : ''}，已重试 ${maxRetries} 次`);
    // 记录最后一次错误的详细信息
    if (lastError instanceof Error) {
        logger_1.default.error(`最后一次错误: ${lastError.message}`);
        logger_1.default.error(`错误类型: ${lastError.constructor.name}`);
        logger_1.default.error(`错误堆栈: ${lastError.stack || '无堆栈信息'}`);
        // 记录完整的错误对象
        logger_1.default.debug(`retryWithBackoff: 最后一次完整错误对象: ${JSON.stringify(lastError, null, 2)}`);
    }
    else {
        logger_1.default.error(`最后一次错误: ${JSON.stringify(lastError)}`);
        logger_1.default.debug(`retryWithBackoff: 最后一次完整错误对象: ${JSON.stringify(lastError, null, 2)}`);
    }
    // 记录重试统计信息
    logger_1.default.debug(`retryWithBackoff: 重试统计 - 总尝试次数: ${attempt}, 最大重试次数: ${maxRetries}`);
    // 记录系统环境信息
    try {
        logger_1.default.debug(`retryWithBackoff: 重试结束时间: ${new Date().toISOString()}`);
        logger_1.default.debug(`retryWithBackoff: 最终内存使用: ${JSON.stringify(process.memoryUsage())}`);
    }
    catch (envError) {
        logger_1.default.debug(`retryWithBackoff: 记录最终环境信息失败: ${envError instanceof Error ? envError.message : String(envError)}`);
    }
    throw lastError;
}
//# sourceMappingURL=errorHandler.js.map