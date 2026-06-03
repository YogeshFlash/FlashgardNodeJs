/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.cc.listener;

import com.inuker.bluetooth.library.search.SearchResult;

public interface IBluetoothSearchListener {
    public void onDeviceFounded(SearchResult var1);

    public void onComplete();

    public void onError(String var1);

    public void onError(int var1);
}

