// OAuth2 中间件 for 彩虹聚合登录

// 声明KV存储
let AUTH_STORE;

// 初始化KV存储
function initKVStore(env) {
    AUTH_STORE = env.AUTH_STORE;
}

// 配置信息
const config = {
    appid: 'YOUR_APP_ID', // 你的彩虹聚合登录appid
    appkey: 'YOUR_APP_SECRET', // 你的彩虹聚合登录appkey
    rblogin_api: 'RBLOGIN_API_URL',
    supported_types: ['qq', 'wx', 'alipay', 'sina', 'baidu', 'huawei', 'xiaomi', 'google', 'microsoft', 'facebook', 'twitter', 'wework', 'dingtalk', 'gitee', 'github']
};

// 工具函数
function generateRandomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
}

// 增加错误日志记录函数
function logError(context, error, details = {}) {
    console.error('Error in ' + context + ':', {
        error: error.message || error,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        ...details
    });
}

// OAuth2 授权端点
async function handleAuthorize(request) {
    const url = new URL(request.url);
    const params = url.searchParams;
    const requestParams = {
        client_id: params.get('client_id'),
        redirect_uri: params.get('redirect_uri'),
        response_type: params.get('response_type'),
        scope: params.get('scope'),
        state: params.get('state')
    };

    console.log('Authorize request:', requestParams);

    if (!requestParams.client_id || !requestParams.redirect_uri || requestParams.response_type !== 'code' || !requestParams.scope) {
        const error = {
            error: 'invalid_request',
            error_description: '缺少必需的参数'
        };
        logError('handleAuthorize', 'Invalid parameters', { requestParams, error });
        return new Response(JSON.stringify(error), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const loginType = requestParams.scope.split(' ')[0];
    if (!config.supported_types.includes(loginType)) {
        const error = {
            error: 'invalid_scope',
            error_description: '不支持的登录类型'
        };
        logError('handleAuthorize', 'Unsupported login type', { loginType, requestParams, error });
        return new Response(JSON.stringify(error), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const callbackUrl = new URL(request.url);
    const middlewareCallback = `${callbackUrl.protocol}//${callbackUrl.host}/oauth/callback?redirect_uri=${encodeURIComponent(requestParams.redirect_uri)}&state=${requestParams.state || ''}`;

    const rbloginUrl = `${config.rblogin_api}/connect.php?act=login&appid=${config.appid}&appkey=${config.appkey}&type=${loginType}&redirect_uri=${encodeURIComponent(middlewareCallback)}`;

    try {
        console.log('Calling rblogin API:', rbloginUrl);
        const response = await fetch(rbloginUrl);
        const data = await response.json();
        console.log('Rblogin API response:', data);

        if (data.code === 0) {
            return Response.redirect(data.url, 302);
        } else {
            const error = {
                error: 'server_error',
                error_description: data.msg
            };
            logError('handleAuthorize', 'Rblogin API error', { rbloginUrl, response: data, error });
            return new Response(JSON.stringify(error), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        logError('handleAuthorize', error, { rbloginUrl });
        return new Response(JSON.stringify({
            error: 'server_error',
            error_description: '服务器内部错误',
            error_details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// OAuth2 令牌端点
// Cloudflare KV配置
const KV_EXPIRE_TIME = 300000; // 5分钟过期

// KV操作封装
async function setKV(key, value, expirationTtl = KV_EXPIRE_TIME) {
    await AUTH_STORE.put(key, JSON.stringify(value), {
        expirationTtl: Math.floor(expirationTtl / 1000) // 转换为秒
    });
}

async function getKV(key) {
    const value = await AUTH_STORE.get(key);
    return value ? JSON.parse(value) : null;
}

async function deleteKV(key) {
    await AUTH_STORE.delete(key);
}

// 回调处理路由
async function handleCallback(request) {
    const url = new URL(request.url);
    const params = url.searchParams;
    const requestParams = {
        code: params.get('code'),
        state: params.get('state'),
        type: params.get('type'),
        redirect_uri: params.get('redirect_uri')
    };

    console.log('Callback request:', requestParams);

    if (!requestParams.code || !requestParams.type || !requestParams.redirect_uri) {
        const error = {
            error: 'invalid_request',
            error_description: '缺少必需的参数'
        };
        logError('handleCallback', 'Missing required parameters', { requestParams, error });
        return new Response(JSON.stringify(error), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const rbloginUrl = `${config.rblogin_api}/connect.php?act=callback&appid=${config.appid}&appkey=${config.appkey}&type=${requestParams.type}&code=${requestParams.code}`;

    try {
        console.log('Calling rblogin API:', rbloginUrl);
        const response = await fetch(rbloginUrl);
        const data = await response.json();
        console.log('Rblogin API response:', data);

        if (data.code === 0 && data.social_uid) {
            const authCode = generateRandomString(32);
            const userInfo = {
                social_uid: data.social_uid,
                nickname: data.nickname || 'Unknown',
                faceimg: data.faceimg || '',
                gender: data.gender || '',
                location: data.location || '',
                type: requestParams.type,
                expires_at: Date.now() + KV_EXPIRE_TIME
            };

            try {
                await setKV(authCode, userInfo);
                console.log('User info stored in KV:', { authCode, userInfo });

                const callbackUrl = new URL(requestParams.redirect_uri);
                callbackUrl.searchParams.set('code', authCode);
                if (requestParams.state) {
                    callbackUrl.searchParams.set('state', requestParams.state);
                }

                console.log('Redirecting to:', callbackUrl.toString());
                return Response.redirect(callbackUrl.toString(), 302);
            } catch (kvError) {
                logError('handleCallback', kvError, { operation: 'KV storage', authCode, userInfo });
                return new Response(JSON.stringify({
                    error: 'server_error',
                    error_description: 'KV存储服务错误',
                    error_details: kvError.message
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else {
            const error = {
                error: 'server_error',
                error_description: data.msg || '彩虹登录接口返回错误'
            };
            logError('handleCallback', 'Invalid rblogin response', { rbloginUrl, response: data, error });
            return new Response(JSON.stringify(error), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        logError('handleCallback', error, { rbloginUrl });
        return new Response(JSON.stringify({
            error: 'server_error',
            error_description: '调用彩虹登录接口失败',
            error_details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 修改handleToken函数
async function handleToken(request) {
    if (request.method !== 'POST') {
        const error = {
            error: 'invalid_request',
            error_description: '只支持POST请求'
        };
        logError('handleToken', 'Invalid request method', { method: request.method, error });
        return new Response(JSON.stringify(error), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const formData = await request.formData();
    const requestParams = {
        grant_type: formData.get('grant_type'),
        code: formData.get('code'),
        redirect_uri: formData.get('redirect_uri')
    };

    console.log('Token request:', requestParams);

    if (requestParams.grant_type !== 'authorization_code' || !requestParams.code || !requestParams.redirect_uri) {
        const error = {
            error: 'invalid_request',
            error_description: '缺少必需的参数'
        };
        logError('handleToken', 'Invalid parameters', { requestParams, error });
        return new Response(JSON.stringify(error), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const userInfo = await getKV(requestParams.code);

    if (!userInfo || userInfo.expires_at < Date.now()) {
        const error = {
            error: 'invalid_grant',
            error_description: '无效的授权码或授权码已过期'
        };
        logError('handleToken', 'Invalid or expired code', { code: requestParams.code, userInfo, error });
        await deleteKV(requestParams.code);
        return new Response(JSON.stringify(error), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const accessToken = generateRandomString(32);
    const refreshToken = generateRandomString(32);

    const tokenInfo = {
        ...userInfo,
        expires_at: Date.now() + 3600000
    };

    try {
        await setKV(accessToken, tokenInfo, 3600000);
        await deleteKV(requestParams.code);

        const response = {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: refreshToken,
            scope: userInfo.type,
            user_id: userInfo.social_uid
        };

        console.log('Token response:', response);
        return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        logError('handleToken', error, { operation: 'Token storage', accessToken, tokenInfo });
        return new Response(JSON.stringify({
            error: 'server_error',
            error_description: 'Token存储失败',
            error_details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 修改handleUserInfo函数
async function handleUserInfo(request) {
    const authHeader = request.headers.get('Authorization');
    console.log('UserInfo request headers:', { Authorization: authHeader });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = {
            error: 'invalid_token',
            error_description: '无效的访问令牌'
        };
        logError('handleUserInfo', 'Invalid authorization header', { authHeader, error });
        return new Response(JSON.stringify(error), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const accessToken = authHeader.slice(7);
    const userInfo = await getKV(accessToken);

    if (!userInfo || userInfo.expires_at < Date.now()) {
        const error = {
            error: 'invalid_token',
            error_description: '无效的访问令牌或令牌已过期'
        };
        logError('handleUserInfo', 'Invalid or expired token', { accessToken, userInfo, error });
        await deleteKV(accessToken);
        return new Response(JSON.stringify(error), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const response = {
        id: userInfo.social_uid,
        name: userInfo.nickname,
        avatar: userInfo.faceimg,
        gender: userInfo.gender,
        location: userInfo.location || null,
        provider: userInfo.type
    };

    console.log('UserInfo response:', response);
    return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// 修改路由处理
async function handleRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 路由处理
    switch (path) {
        case '/oauth/authorize':
            return handleAuthorize(request);
        case '/oauth/callback':
            return handleCallback(request);
        case '/oauth/token':
            return handleToken(request);
        case '/oauth/userinfo':
            return handleUserInfo(request);
        default:
            return new Response('Not Found', { status: 404 });
    }
}

// 修改导出处理函数
export default {
    fetch: async (request, env) => {
        // 初始化KV存储
        initKVStore(env);
        return handleRequest(request);
    }
};