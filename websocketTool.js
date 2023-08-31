/**
 * websocket工具类
 *
 * 调用方式 let ws = new window.webSocketTool({url: 'ws://192.168.0.143:8910/websocket' });
 *
 */
"use strict";
(function (window) {
  var WebSocketTool = function (options) {
    this.url = options.url; // websocket服务端接口地址
    this.pingTimeout = options.pingTimeout || 15000;//每隔15秒发送一次心跳，如果收到任何后端消息定时器将会重置
    this.pongTimeout = options.pongTimeout || 10000;//ping消息发送之后，10秒内没收到后端消息便会认为连接断开
    this.reconnectTimeout = options.reconnectTimeout || 2000;//尝试重连的间隔时间
    this.pingMsg = options.pingMsg || 'ping';//ping消息值
    this.repeatLimit = options.repeatLimit || null;//重连尝试次数。默认不限


    // 内部使用 禁止修改
    this.ws = null; // websocket 实例
    this.repeat = 0; // 已经重连次数

    //外部重写钩子函数
    this.onclose = function () {
    };
    this.onerror = function () {
    };
    this.onopen = function () {
    };
    this.onmessage = function () {
    };
    this.onreconnect = function () {
    };

    this.initial(); // 初始函数
  };
  WebSocketTool.prototype = {
    // 初始函数
    initial: function () {
      if (!this.url) {
        alert('url不存在');
        return;
      }
      try {
        this.ws = new WebSocket(this.url);
        this.EventHandle()
      } catch (e) {
        this.reconnect();
        throw e;
      }
    },
    // 事件绑定
    EventHandle: function () {
      this.ws.onclose = () => {
        this.onclose();
        this.reconnect();// 重连
      };
      this.ws.onerror = () => {
        this.onerror();
        this.reconnect(); // 重连
      };
      this.ws.onopen = () => {
        this.repeat = 0;
        this.onopen();
        //心跳检测重置
        this.heartCheck();
      };
      this.ws.onmessage = (event) => {
        this.onmessage(event);
        //如果获取到消息，心跳检测重置
        //拿到任何消息都说明当前连接是正常的
        this.heartCheck();
      };
    },
    reconnect: function () {
      if (this.repeatLimit > 0 && this.repeatLimit <= this.repeat) return;//限制重复
      if (this.lockReconnect || this.forbidReconnect) return;
      this.lockReconnect = true;
      this.repeat++;//必须在lockReconnect之后，避免进行无效计数
      this.onreconnect(this.repeat);
      //没连接上会一直重连，设置延迟避免请求过多
      setTimeout(() => {
        this.initial();
        this.lockReconnect = false;
      }, this.reconnectTimeout);
    },
    send: function (msg) {
      this.ws.send(msg);
    },
    //心跳检测
    heartCheck: function () {
      this.heartReset();
      this.heartStart();
    },
    heartStart: function () {
      if (this.forbidReconnect) return;//不再重连就不再执行心跳
      this.pingTimeoutId = setTimeout(() => {
        //这里发送一个心跳，后端收到后，返回一个心跳消息，
        //onmessage拿到返回的心跳就说明连接正常
        this.ws.send(this.pingMsg);
        //如果超过一定时间还没重置，说明后端主动断开了
        this.pongTimeoutId = setTimeout(() => {
          //如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
          this.ws.close();
        }, this.pongTimeout);
      }, this.pingTimeout);
    },
    heartReset: function () {
      clearTimeout(this.pingTimeoutId);
      clearTimeout(this.pongTimeoutId);
    },
    close: function () {
      //如果手动关闭连接，不再重连
      this.forbidReconnect = true;
      this.heartReset();
      this.ws.close();
    }
  };
  if (window) window.webSocketTool = WebSocketTool;
}(window));
