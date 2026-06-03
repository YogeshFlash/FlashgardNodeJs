/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.AsyncTask
 *  android.os.Handler
 *  android.os.Looper
 */
package com.inuker.bluetooth.library.e;

import android.os.AsyncTask;
import android.os.Handler;
import android.os.Looper;
import java.util.concurrent.Executor;
import java.util.concurrent.FutureTask;

public abstract class h
extends AsyncTask<Void, Void, Void> {
    private static Handler a;

    public abstract void a();

    protected Void a(Void ... voidArray) {
        this.a();
        return null;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     * Enabled force condition propagation
     * Lifted jumps to return sites
     */
    private static Handler b() {
        if (a != null) return a;
        Class<h> clazz = h.class;
        synchronized (h.class) {
            if (a != null) return a;
            a = new Handler(Looper.getMainLooper());
            // ** MonitorExit[var0] (shouldn't be in output)
            return a;
        }
    }

    public void a(final Executor executor, long l2) {
        h.b().postDelayed(new Runnable(){

            @Override
            public void run() {
                h.this.executeOnExecutor(executor != null ? executor : AsyncTask.THREAD_POOL_EXECUTOR, new Void[0]);
            }
        }, l2);
    }

    public void a(final Executor executor) {
        h.b().post(new Runnable(){

            @Override
            public void run() {
                h.this.executeOnExecutor(executor != null ? executor : AsyncTask.THREAD_POOL_EXECUTOR, new Void[0]);
            }
        });
    }

    public static void a(h h2, Executor executor) {
        if (h2 != null) {
            h2.a(executor);
        }
    }

    public static void a(h h2, Executor executor, long l2) {
        if (h2 != null) {
            h2.a(executor, l2);
        }
    }

    public static void a(final FutureTask futureTask, final Executor executor, long l2) {
        if (futureTask != null && executor != null) {
            h.b().postDelayed(new Runnable(){

                @Override
                public void run() {
                    executor.execute(futureTask);
                }
            }, l2);
        }
    }

    protected /* synthetic */ Object doInBackground(Object[] objectArray) {
        return this.a((Void[])objectArray);
    }
}

