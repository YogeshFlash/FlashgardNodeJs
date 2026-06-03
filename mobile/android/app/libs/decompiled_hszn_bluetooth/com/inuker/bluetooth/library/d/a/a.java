/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.Looper
 *  android.os.Message
 */
package com.inuker.bluetooth.library.d.a;

import android.os.Handler;
import android.os.Looper;
import android.os.Message;

public abstract class a
implements Handler.Callback {
    private static final int a = 1;
    private static final int b = 2;
    private Handler c;
    private Handler d;

    public a() {
        if (Looper.myLooper() == null) {
            throw new IllegalStateException();
        }
        this.c = new Handler(Looper.myLooper(), (Handler.Callback)this);
        this.d = new Handler(Looper.getMainLooper(), (Handler.Callback)this);
    }

    public boolean handleMessage(Message message) {
        Object[] objectArray = (Object[])message.obj;
        switch (message.what) {
            case 1: {
                this.onInvoke(objectArray);
                break;
            }
            case 2: {
                this.onSyncInvoke(objectArray);
            }
        }
        return true;
    }

    public final void invoke(Object ... objectArray) {
        this.c.obtainMessage(1, (Object)objectArray).sendToTarget();
    }

    public final void invokeSync(Object ... objectArray) {
        this.d.obtainMessage(2, (Object)objectArray).sendToTarget();
    }

    public abstract void onInvoke(Object ... var1);

    public abstract void onSyncInvoke(Object ... var1);
}

