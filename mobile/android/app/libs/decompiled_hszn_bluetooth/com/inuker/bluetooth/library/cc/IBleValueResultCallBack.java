/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.cc;

public interface IBleValueResultCallBack<T> {
    public void onSuccessful(T var1);

    public void onError(String var1);

    public void onError(int var1);
}

